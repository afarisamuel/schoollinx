package usecase

import (
	"context"

	"github.com/google/uuid"

	"github.com/user/high-school-management/backend/internal/domain"
)

type welfareUseCase struct {
	repo      domain.WelfareRepository
	sms       domain.SMSProvider
	students  domain.StudentRepository
	guardians domain.GuardianRepository
}

func NewWelfareUseCase(repo domain.WelfareRepository, sms domain.SMSProvider, students domain.StudentRepository, guardians domain.GuardianRepository) domain.WelfareUseCase {
	return &welfareUseCase{repo: repo, sms: sms, students: students, guardians: guardians}
}

// Health Records
func (u *welfareUseCase) GetStudentHealth(ctx context.Context, studentID uuid.UUID) (*domain.HealthRecord, error) {
	return u.repo.GetHealthRecord(ctx, studentID)
}

func (u *welfareUseCase) UpdateStudentHealth(ctx context.Context, record *domain.HealthRecord) error {
	return u.repo.UpsertHealthRecord(ctx, record)
}

// Behavior Logs
func (u *welfareUseCase) GetStudentBehavior(ctx context.Context, studentID uuid.UUID) ([]domain.BehaviorLog, error) {
	return u.repo.GetBehaviorLogs(ctx, studentID)
}

func (u *welfareUseCase) LogBehaviorEvent(ctx context.Context, log *domain.BehaviorLog) error {
	err := u.repo.CreateBehaviorLog(ctx, log)
	if err != nil {
		return err
	}

	if log.Type == "DEMERIT" {
		logs, err := u.repo.GetBehaviorLogs(ctx, log.StudentID)
		if err == nil {
			demeritCount := 0
			for _, l := range logs {
				if l.Type == "DEMERIT" {
					demeritCount++
				}
			}

			// Threshold alert logic (e.g., alert every 3 demerits)
			if demeritCount > 0 && demeritCount%3 == 0 {
				student, err := u.students.GetByID(ctx, log.StudentID)
				if err == nil && student != nil {
					guardians, err := u.guardians.GetForStudent(ctx, student.ID)
					if err == nil {
						msg := "ALERT: " + string(student.FirstName) + " has reached " + string(rune(demeritCount+'0')) + " demerits. Recent issue: " + log.Category + ". Please contact the school."
						// Fallback string conversion for numbers since it might be >= 10
						msg = "ALERT: " + string(student.FirstName) + " has received multiple demerits recently (" + log.Category + "). Please contact the school."
						
						var phones []string
						for _, g := range guardians {
							phone := string(g.PhoneNumber)
							if phone != "" {
								phones = append(phones, phone)
							}
						}

						if len(phones) > 0 {
							_ = u.sms.SendSMS(ctx, "DISCIPLINE", phones, msg)
						}
					}
				}
			}
		}
	}

	return nil
}

func (u *welfareUseCase) RemoveBehaviorEvent(ctx context.Context, id uuid.UUID) error {
	return u.repo.DeleteBehaviorLog(ctx, id)
}
