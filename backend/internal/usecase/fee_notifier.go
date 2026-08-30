package usecase

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/pkg/encryption"
)

type FeePaymentNotification struct {
	StudentID        uuid.UUID
	Amount           float64
	Category         string
	PaymentMethod    string
	ReceiptReference string
	RemainingBalance float64
	Note             string
}

type FeeNotifier interface {
	NotifyPayment(ctx context.Context, p FeePaymentNotification) error
}

type feeNotifier struct {
	sms          domain.SMSProvider
	notifUC      domain.NotificationUseCase
	studentRepo  domain.StudentRepository
	guardianRepo domain.GuardianRepository
	tenantRepo   domain.TenantRepository
}

func NewFeeNotifier(
	sms domain.SMSProvider,
	notifUC domain.NotificationUseCase,
	studentRepo domain.StudentRepository,
	guardianRepo domain.GuardianRepository,
	tenantRepo domain.TenantRepository,
) FeeNotifier {
	return &feeNotifier{
		sms:          sms,
		notifUC:      notifUC,
		studentRepo:  studentRepo,
		guardianRepo: guardianRepo,
		tenantRepo:   tenantRepo,
	}
}

func (n *feeNotifier) NotifyPayment(ctx context.Context, p FeePaymentNotification) error {
	if p.StudentID == uuid.Nil || p.Amount <= 0 {
		return nil
	}

	// 1. Fetch Student Details
	student, err := n.studentRepo.GetByID(ctx, p.StudentID)
	if err != nil || student == nil {
		return err
	}

	studentName := strings.TrimSpace(fmt.Sprintf("%s %s", string(student.FirstName), string(student.LastName)))
	if studentName == "" {
		studentName = "Student"
	}

	className := ""
	if student.Class != nil && student.Class.Name != "" {
		className = student.Class.Name
	} else if student.EnrollmentNum != "" {
		className = student.EnrollmentNum
	}

	displayClass := ""
	if className != "" {
		displayClass = fmt.Sprintf(" (%s)", className)
	}

	categoryDisplay := p.Category
	if categoryDisplay == "" {
		categoryDisplay = "School Fees"
	}

	refDisplay := p.ReceiptReference
	if refDisplay == "" {
		refDisplay = fmt.Sprintf("REC-%s", strings.ToUpper(uuid.New().String()[:8]))
	}

	balDisplay := fmt.Sprintf("GHS %.2f", p.RemainingBalance)
	if p.RemainingBalance <= 0 {
		balDisplay = "GHS 0.00 (Cleared)"
	}

	today := time.Now().Format("02-Jan-2006")
	methodDisplay := p.PaymentMethod
	if methodDisplay == "" {
		methodDisplay = "Direct"
	}

	// 2. Fetch Guardians and Contacts
	phoneSet := make(map[string]bool)
	var phones []string
	var guardianUserIDs []uuid.UUID

	if n.guardianRepo != nil {
		guardians, _ := n.guardianRepo.GetForStudent(ctx, student.ID)
		for _, g := range guardians {
			if g == nil {
				continue
			}
			phone := cleanPhoneNumber(string(g.PhoneNumber))
			if phone != "" && !phoneSet[phone] {
				phoneSet[phone] = true
				phones = append(phones, phone)
			}
			if g.UserID != uuid.Nil {
				guardianUserIDs = append(guardianUserIDs, g.UserID)
			}
		}
	}

	// Fallback contacts from student profile
	for _, fp := range []string{
		cleanPhoneNumber(string(student.GuardianPhone)),
		cleanPhoneNumber(string(student.FatherPhone)),
		cleanPhoneNumber(string(student.MotherPhone)),
	} {
		if fp != "" && !phoneSet[fp] {
			phoneSet[fp] = true
			phones = append(phones, fp)
		}
	}

	// 3. Dispatch SMS Notification to Parent(s)
	smsMessage := fmt.Sprintf("Receipt: Payment of GHS %.2f received for %s%s. Category: %s. Ref: %s. Bal: %s. Date: %s. Thank you.",
		p.Amount, studentName, displayClass, categoryDisplay, refDisplay, balDisplay, today)

	if n.sms != nil && len(phones) > 0 {
		go func(recipients []string, msg string) {
			_ = n.sms.SendSMS(context.Background(), "FINANCE", recipients, msg)
		}(phones, smsMessage)
	}

	// 4. In-System Notifications
	dataJSON := datatypes.JSON([]byte(fmt.Sprintf(
		`{"student_id":"%s","student_name":"%s","amount":%.2f,"reference":"%s","category":"%s","balance":%.2f,"method":"%s"}`,
		p.StudentID.String(), studentName, p.Amount, refDisplay, categoryDisplay, p.RemainingBalance, methodDisplay,
	)))

	if n.notifUC != nil {
		// A. In-system notification for Parent(s)
		parentNotifMsg := fmt.Sprintf("Payment of GHS %.2f confirmed for %s%s. Category: %s. Receipt Ref: %s. Outstanding Balance: %s.",
			p.Amount, studentName, displayClass, categoryDisplay, refDisplay, balDisplay)

		for _, uid := range guardianUserIDs {
			_ = n.notifUC.SendToUser(uid, domain.Notification{
				Type:    domain.NotificationPayment,
				Title:   "Fee Payment Confirmed",
				Message: parentNotifMsg,
				Data:    dataJSON,
			})
		}

		// B. In-system notification for Admins & Finance Officers
		adminNotifMsg := fmt.Sprintf("GHS %.2f received for %s%s via %s. Category: %s. Ref: %s. Remaining: %s.",
			p.Amount, studentName, displayClass, methodDisplay, categoryDisplay, refDisplay, balDisplay)

		_ = n.notifUC.SendToRole(domain.RoleAdmin, domain.Notification{
			Type:    domain.NotificationPayment,
			Title:   "New Fee Payment Received",
			Message: adminNotifMsg,
			Data:    dataJSON,
		})

		// C. Real-time broadcast so any active admin portal or parent portal immediately updates
		_ = n.notifUC.Broadcast(domain.Notification{
			Type:    domain.NotificationPayment,
			Title:   "Fee Payment Received",
			Message: adminNotifMsg,
			Data:    dataJSON,
		})

		// D. In-system notification for Student (if student has an account)
		if student.UserID != nil && *student.UserID != uuid.Nil {
			studentNotifMsg := fmt.Sprintf("A fee payment of GHS %.2f has been credited to your account (%s). Ref: %s.",
				p.Amount, categoryDisplay, refDisplay)

			_ = n.notifUC.SendToUser(*student.UserID, domain.Notification{
				Type:    domain.NotificationPayment,
				Title:   "Fee Payment Credited",
				Message: studentNotifMsg,
				Data:    dataJSON,
			})
		}
	}

	return nil
}

func cleanPhoneNumber(phone string) string {
	phone = strings.TrimSpace(phone)
	if phone == "" {
		return ""
	}
	// If the string is encrypted, attempt decryption
	if decrypted, err := encryption.Decrypt(phone, ""); err == nil && decrypted != "" {
		phone = decrypted
	}
	// Remove common spacing and separators
	replacer := strings.NewReplacer(" ", "", "-", "", "(", "", ")", "", ".", "")
	phone = replacer.Replace(phone)
	if len(phone) < 9 {
		return ""
	}
	return phone
}
