package usecase

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"github.com/user/high-school-management/backend/internal/domain"
)

var scanDebounceMap sync.Map // Map[string]time.Time (Gap #12)

type AttendanceUseCase struct {
	repo         domain.AttendanceRepository
	campaignMgr  CampaignManager
	studentRepo  domain.StudentRepository
	fiscalUC     domain.FiscalUseCase
	academicRepo domain.AcademicPeriodRepository
	notifUC      domain.NotificationUseCase
	sms          domain.SMSProvider
	guardianRepo domain.GuardianRepository
	tenantRepo   domain.TenantRepository
}

func NewAttendanceUseCase(
	repo domain.AttendanceRepository,
	campaignMgr CampaignManager,
	studentRepo domain.StudentRepository,
	fiscalUC domain.FiscalUseCase,
	academicRepo domain.AcademicPeriodRepository,
	notifUC domain.NotificationUseCase,
	sms domain.SMSProvider,
	guardianRepo domain.GuardianRepository,
	tenantRepo domain.TenantRepository,
) domain.AttendanceUseCase {
	return &AttendanceUseCase{
		repo:         repo,
		campaignMgr:  campaignMgr,
		studentRepo:  studentRepo,
		fiscalUC:     fiscalUC,
		academicRepo: academicRepo,
		notifUC:      notifUC,
		sms:          sms,
		guardianRepo: guardianRepo,
		tenantRepo:   tenantRepo,
	}
}

func (u *AttendanceUseCase) notifyAttendanceToGuardian(studentID uuid.UUID, status domain.AttendanceStatus, remarks string, timestamp time.Time) {
	if studentID == uuid.Nil || u.studentRepo == nil {
		return
	}

	go func() {
		bgCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		student, err := u.studentRepo.GetByID(bgCtx, studentID)
		if err != nil || student == nil {
			return
		}

		studentName := strings.TrimSpace(fmt.Sprintf("%s %s", string(student.FirstName), string(student.LastName)))
		if studentName == "" {
			studentName = "Student"
		}

		timeStr := timestamp.Format("3:04 PM")
		dateStr := timestamp.Format("02 Jan 2006")

		statusLabel := string(status)
		if status == domain.StatusPresent {
			statusLabel = "PRESENT (Checked-In)"
		} else if status == domain.StatusAbsent {
			statusLabel = "ABSENT"
		} else if status == domain.StatusTardy {
			statusLabel = "LATE / TARDY"
		}

		// Collect phone numbers & guardian user IDs
		phoneSet := make(map[string]bool)
		var phones []string
		var guardianUserIDs []uuid.UUID

		if u.guardianRepo != nil {
			guardians, _ := u.guardianRepo.GetForStudent(bgCtx, student.ID)
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

		smsText := fmt.Sprintf("Attendance: %s recorded as %s at SchoolLinx on %s (%s). %s",
			studentName, statusLabel, dateStr, timeStr, remarks)
		if student.PrepaidBalance < 0 {
			smsText += fmt.Sprintf(" Daily fee charged. Wallet Overdraft: -GH₵%.2f. Please top up at your Parent Portal.", -student.PrepaidBalance)
		} else if student.PrepaidBalance > 0 {
			smsText += fmt.Sprintf(" Remaining Wallet Balance: GH₵%.2f.", student.PrepaidBalance)
		}

		// 1. Send SMS to Guardian(s)
		if u.sms != nil && len(phones) > 0 {
			_ = u.sms.SendSMS(bgCtx, "ATTENDANCE", phones, smsText)
		}

		// 2. Send In-System & Web Push Notification to Guardian(s) and Student
		if u.notifUC != nil {
			notifTitle := fmt.Sprintf("Attendance: %s (%s)", studentName, statusLabel)
			notifMsg := fmt.Sprintf("%s was recorded as %s on %s at %s. %s", studentName, statusLabel, dateStr, timeStr, remarks)

			notifData := datatypes.JSON([]byte(fmt.Sprintf(
				`{"student_id":"%s","student_name":"%s","status":"%s","time":"%s","date":"%s"}`,
				student.ID.String(), studentName, status, timeStr, dateStr,
			)))

			for _, uid := range guardianUserIDs {
				_ = u.notifUC.SendToUser(uid, domain.Notification{
					Type:    domain.NotificationAttendance,
					Title:   notifTitle,
					Message: notifMsg,
					Data:    notifData,
				})
			}

			if student.UserID != nil && *student.UserID != uuid.Nil {
				_ = u.notifUC.SendToUser(*student.UserID, domain.Notification{
					Type:    domain.NotificationAttendance,
					Title:   notifTitle,
					Message: notifMsg,
					Data:    notifData,
				})
			}
		}
	}()
}

func (u *AttendanceUseCase) MarkAttendance(ctx context.Context, attendance *domain.Attendance) error {
	if attendance.ClassID == uuid.Nil && attendance.StudentID != uuid.Nil && u.studentRepo != nil {
		if student, err := u.studentRepo.GetByID(ctx, attendance.StudentID); err == nil && student != nil && student.ClassID != nil {
			attendance.ClassID = *student.ClassID
		}
	}

	err := u.repo.Create(ctx, attendance)
	if err == nil {
		if attendance.Status == domain.StatusPresent {
			if activePeriod, pErr := u.academicRepo.GetActive(ctx); pErr == nil && activePeriod != nil {
				_ = u.fiscalUC.ProcessAttendanceBilling(ctx, attendance.StudentID, activePeriod.ID)
			}
		}
		u.notifyAttendanceToGuardian(attendance.StudentID, attendance.Status, attendance.Remarks, attendance.Date)
	}
	return err
}

func (u *AttendanceUseCase) MarkBulkAttendance(ctx context.Context, attendances []domain.Attendance) error {
	err := u.repo.BulkCreate(ctx, attendances)
	if err == nil {
		activePeriod, _ := u.academicRepo.GetActive(ctx)
		for _, attendance := range attendances {
			if attendance.Status == domain.StatusPresent && activePeriod != nil {
				_ = u.fiscalUC.ProcessAttendanceBilling(ctx, attendance.StudentID, activePeriod.ID)
			}
			u.notifyAttendanceToGuardian(attendance.StudentID, attendance.Status, attendance.Remarks, attendance.Date)
		}
	}
	return err
}

func (u *AttendanceUseCase) GetStudentAttendance(ctx context.Context, studentID uuid.UUID) ([]domain.Attendance, error) {
	return u.repo.GetByStudent(ctx, studentID)
}

func (u *AttendanceUseCase) GetClassAttendance(ctx context.Context, classID uuid.UUID, date string) ([]domain.Attendance, error) {
	return u.repo.GetByClassAndDate(ctx, classID, date)
}

func (u *AttendanceUseCase) AnalyzeAbsences(ctx context.Context, threshold int) error {
	students, err := u.studentRepo.GetAll(ctx)
	if err != nil {
		return err
	}

	for _, student := range students {
		attendances, err := u.repo.GetByStudent(ctx, student.ID)
		if err != nil || len(attendances) == 0 {
			continue
		}

		// Sort or assume they are ordered by date (usually handled in repo). 
		// For simplicity, we just count recent consecutive absences based on threshold.
		consecutive := 0
		for i := len(attendances) - 1; i >= 0; i-- {
			if attendances[i].Status == domain.StatusAbsent {
				consecutive++
			} else if attendances[i].Status == domain.StatusPresent {
				break // Streak broken
			}
		}

		if consecutive >= threshold {
			// Trigger campaign alert to guardians
			campaign := &domain.Campaign{
				Subject:   "Welfare Alert: Excessive Absences",
				BodyHTML:  "Student has missed " + string(rune(consecutive+'0')) + " consecutive days.",
				Target:    "ALL_PARENTS", // Ideally we'd target just the student's guardian
			}
			err = u.campaignMgr.DraftCampaign(ctx, campaign)
			if err == nil {
				_ = u.campaignMgr.DispatchCampaign(ctx, campaign.ID)
			}
		}
	}

	return nil
}

func (u *AttendanceUseCase) ProcessHardwareScan(ctx context.Context, deviceID, rfidToken string) error {
	// Gap #12: 60-Second Scan Debounce Guard per device & token
	debounceKey := fmt.Sprintf("%s:%s", deviceID, rfidToken)
	now := time.Now()
	if lastScanVal, exists := scanDebounceMap.Load(debounceKey); exists {
		if lastScanTime, ok := lastScanVal.(time.Time); ok && now.Sub(lastScanTime) < 60*time.Second {
			// Debounced duplicate scan within 60s
			return nil
		}
	}
	scanDebounceMap.Store(debounceKey, now)

	scan := &domain.ScanEvent{
		DeviceID:  deviceID,
		RFIDToken: rfidToken,
		Timestamp: now,
		Processed: false,
	}

	// 1. Log the raw event for auditing
	if err := u.repo.LogScanEvent(ctx, scan); err != nil {
		return err
	}

	// 2. Map the RFID token to a student and auto-mark attendance
	students, err := u.studentRepo.GetAll(ctx)
	if err != nil {
		return nil // Log but don't fail
	}

	var matchedStudent *domain.Student
	for i := range students {
		if students[i].RFIDToken == rfidToken {
			matchedStudent = &students[i]
			break
		}
	}

	// Gap #13: Security alert on unregistered badge scanned at physical gate turnstile
	if matchedStudent == nil {
		if u.notifUC != nil {
			_ = u.notifUC.Broadcast(domain.Notification{
				Type:    domain.NotificationSystem,
				Title:   "Security Alert: Unregistered Token Scanned",
				Message: fmt.Sprintf("Unrecognized RFID token [%s] presented at hardware terminal [%s]", rfidToken, deviceID),
			})
		}
		return nil // Token not mapped yet
	}

	// 3. Auto-create attendance record for today
	today := time.Now().Format("2006-01-02")
	attendance := &domain.Attendance{
		StudentID: matchedStudent.ID,
		Date:      time.Now(),
		Status:    domain.StatusPresent,
		Remarks:   "Auto-recorded via " + deviceID,
	}

	if err := u.repo.Create(ctx, attendance); err != nil {
		_ = today
		return err
	}

	// 3b. Trigger billing for the attendance if an active period exists
	if activePeriod, pErr := u.academicRepo.GetActive(ctx); pErr == nil && activePeriod != nil {
		_ = u.fiscalUC.ProcessAttendanceBilling(ctx, attendance.StudentID, activePeriod.ID)
	}

	// 3c. Send real-time Gate Ingress / Egress notification
	u.notifyAttendanceToGuardian(matchedStudent.ID, domain.StatusPresent, "Campus gate entry scanned via "+deviceID, now)

	// 4. Mark scan as processed
	scan.Processed = true

	return nil
}

func (u *AttendanceUseCase) GetRecentScanEvents(ctx context.Context, limit int) ([]domain.EnrichedScanEvent, error) {
	rawEvents, err := u.repo.GetRecentScanEvents(ctx, limit)
	if err != nil {
		return nil, err
	}

	// Build a token→student map for name resolution
	students, _ := u.studentRepo.GetAll(ctx)
	tokenMap := make(map[string]*domain.Student, len(students))
	for i := range students {
		if students[i].RFIDToken != "" {
			tokenMap[students[i].RFIDToken] = &students[i]
		}
	}

	enriched := make([]domain.EnrichedScanEvent, 0, len(rawEvents))
	for _, ev := range rawEvents {
		e := domain.EnrichedScanEvent{
			ID:        ev.ID,
			DeviceID:  ev.DeviceID,
			RFIDToken: ev.RFIDToken,
			Timestamp: ev.Timestamp,
			Processed: ev.Processed,
		}
		if s, ok := tokenMap[ev.RFIDToken]; ok {
			sid := s.ID
			e.StudentID = &sid
			e.StudentName = string(s.FirstName) + " " + string(s.LastName)
		}
		enriched = append(enriched, e)
	}
	return enriched, nil
}

func (u *AttendanceUseCase) RegisterDevice(ctx context.Context, device *domain.BiometricDevice) error {
	device.Status = "ONLINE"
	device.LastPing = time.Now()
	return u.repo.RegisterDevice(ctx, device)
}

func (u *AttendanceUseCase) UpdateDevice(ctx context.Context, device *domain.BiometricDevice) error {
	existing, err := u.repo.GetDeviceByID(ctx, device.ID)
	if err != nil {
		return err
	}
	existing.Name = device.Name
	existing.Type = device.Type
	existing.IPAddress = device.IPAddress
	existing.Location = device.Location
	return u.repo.UpdateDevice(ctx, existing)
}

func (u *AttendanceUseCase) DeleteDevice(ctx context.Context, id string) error {
	return u.repo.DeleteDevice(ctx, id)
}

func (u *AttendanceUseCase) GetDevices(ctx context.Context) ([]domain.BiometricDevice, error) {
	return u.repo.GetDevices(ctx)
}
