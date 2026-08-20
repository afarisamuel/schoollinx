package usecase

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type AttendanceUseCase struct {
	repo         domain.AttendanceRepository
	campaignMgr  CampaignManager
	studentRepo  domain.StudentRepository
	fiscalUC     domain.FiscalUseCase
	academicRepo domain.AcademicPeriodRepository
	notifUC      domain.NotificationUseCase
}

func NewAttendanceUseCase(repo domain.AttendanceRepository, campaignMgr CampaignManager, studentRepo domain.StudentRepository, fiscalUC domain.FiscalUseCase, academicRepo domain.AcademicPeriodRepository, notifUC domain.NotificationUseCase) domain.AttendanceUseCase {
	return &AttendanceUseCase{repo: repo, campaignMgr: campaignMgr, studentRepo: studentRepo, fiscalUC: fiscalUC, academicRepo: academicRepo, notifUC: notifUC}
}

func (u *AttendanceUseCase) MarkAttendance(ctx context.Context, attendance *domain.Attendance) error {
	err := u.repo.Create(ctx, attendance)
	if err == nil && attendance.Status == domain.StatusPresent {
		if activePeriod, pErr := u.academicRepo.GetActive(ctx); pErr == nil && activePeriod != nil {
			_ = u.fiscalUC.ProcessAttendanceBilling(ctx, attendance.StudentID, activePeriod.ID)
		}
	} else if err == nil && attendance.Status == domain.StatusAbsent && u.notifUC != nil {
		_ = u.notifUC.SendToUser(attendance.StudentID, domain.Notification{
			Type:    domain.NotificationAttendance,
			Title:   "Absence Recorded",
			Message: "An absence has been recorded for today.",
		})
	}
	return err
}

func (u *AttendanceUseCase) MarkBulkAttendance(ctx context.Context, attendances []domain.Attendance) error {
	err := u.repo.BulkCreate(ctx, attendances)
	if err == nil {
		if activePeriod, pErr := u.academicRepo.GetActive(ctx); pErr == nil && activePeriod != nil {
			for _, attendance := range attendances {
				if attendance.Status == domain.StatusPresent {
					_ = u.fiscalUC.ProcessAttendanceBilling(ctx, attendance.StudentID, activePeriod.ID)
				} else if attendance.Status == domain.StatusAbsent && u.notifUC != nil {
					_ = u.notifUC.SendToUser(attendance.StudentID, domain.Notification{
						Type:    domain.NotificationAttendance,
						Title:   "Absence Recorded",
						Message: "An absence has been recorded for today.",
					})
				}
			}
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
	scan := &domain.ScanEvent{
		DeviceID:  deviceID,
		RFIDToken: rfidToken,
		Timestamp: time.Now(),
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

	if matchedStudent == nil {
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
