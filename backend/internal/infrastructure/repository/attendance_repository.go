package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type attendanceRepository struct {
	db *gorm.DB
}

func NewAttendanceRepository(db *gorm.DB) domain.AttendanceRepository {
	return &attendanceRepository{db: db}
}

func (r *attendanceRepository) Create(ctx context.Context, attendance *domain.Attendance) error {
	if r.db == nil {
		return nil
	}
	return r.db.WithContext(ctx).Create(attendance).Error
}

func (r *attendanceRepository) BulkCreate(ctx context.Context, attendances []domain.Attendance) error {
	if r.db == nil || len(attendances) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Create(&attendances).Error
}

func (r *attendanceRepository) GetByStudent(ctx context.Context, studentID uuid.UUID) ([]domain.Attendance, error) {
	var results []domain.Attendance
	if r.db == nil {
		return results, nil
	}
	err := r.db.WithContext(ctx).Where("student_id = ?", studentID).Find(&results).Error
	return results, err
}

func (r *attendanceRepository) GetByClassAndDate(ctx context.Context, classID uuid.UUID, date string) ([]domain.Attendance, error) {
	var results []domain.Attendance
	if r.db == nil {
		return results, nil
	}
	err := r.db.WithContext(ctx).Where("class_id = ? AND date::date = ?", classID, date).Find(&results).Error
	return results, err
}

func (r *attendanceRepository) Update(ctx context.Context, attendance *domain.Attendance) error {
	if r.db == nil {
		return nil
	}
	return r.db.WithContext(ctx).Save(attendance).Error
}

func (r *attendanceRepository) GetAll(ctx context.Context) ([]domain.Attendance, error) {
	var results []domain.Attendance
	if r.db == nil {
		return results, nil
	}
	err := r.db.WithContext(ctx).Find(&results).Error
	return results, err
}

func (r *attendanceRepository) LogScanEvent(ctx context.Context, scan *domain.ScanEvent) error {
	if r.db == nil {
		return nil
	}
	return r.db.WithContext(ctx).Create(scan).Error
}

func (r *attendanceRepository) GetRecentScanEvents(ctx context.Context, limit int) ([]domain.ScanEvent, error) {
	var results []domain.ScanEvent
	if r.db == nil {
		return results, nil
	}
	err := r.db.WithContext(ctx).Order("timestamp DESC").Limit(limit).Find(&results).Error
	return results, err
}

func (r *attendanceRepository) GetAttendanceStats(ctx context.Context) (map[string]int, error) {
	stats := map[string]int{"Present": 0, "Absent": 0, "Tardy": 0}
	if r.db == nil {
		return stats, nil
	}

	var results []struct {
		Status string
		Count  int
	}
	err := r.db.WithContext(ctx).Model(&domain.Attendance{}).Select("status, count(*) as count").Group("status").Scan(&results).Error
	if err != nil {
		return stats, err
	}

	for _, res := range results {
		stats[res.Status] = res.Count
	}
	return stats, nil
}

func (r *attendanceRepository) GetStudentAttendanceStats(ctx context.Context) ([]domain.StudentAttendanceStat, error) {
	var results []domain.StudentAttendanceStat
	if r.db == nil {
		return results, nil
	}

	err := r.db.WithContext(ctx).Model(&domain.Attendance{}).
		Select("student_id, count(case when status = 'Present' then 1 end) as present, count(*) as total").
		Group("student_id").
		Scan(&results).Error
	return results, err
}

func (r *attendanceRepository) RegisterDevice(ctx context.Context, device *domain.BiometricDevice) error {
	return r.db.WithContext(ctx).Create(device).Error
}

func (r *attendanceRepository) UpdateDevice(ctx context.Context, device *domain.BiometricDevice) error {
	return r.db.WithContext(ctx).Save(device).Error
}

func (r *attendanceRepository) DeleteDevice(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&domain.BiometricDevice{}, "id = ?", id).Error
}

func (r *attendanceRepository) GetDevices(ctx context.Context) ([]domain.BiometricDevice, error) {
	var devices []domain.BiometricDevice
	err := r.db.WithContext(ctx).Find(&devices).Error
	return devices, err
}

func (r *attendanceRepository) GetDeviceByID(ctx context.Context, id string) (*domain.BiometricDevice, error) {
	var device domain.BiometricDevice
	err := r.db.WithContext(ctx).First(&device, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &device, nil
}
