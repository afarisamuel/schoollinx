package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// EnrichedScanEvent joins a ScanEvent with resolved student information
type EnrichedScanEvent struct {
	ID            uuid.UUID `json:"id"`
	DeviceID      string    `json:"device_id"`
	RFIDToken     string    `json:"rfid_token"`
	Timestamp     time.Time `json:"timestamp"`
	Processed     bool      `json:"processed"`
	StudentID     *uuid.UUID `json:"student_id,omitempty"`
	StudentName   string    `json:"student_name,omitempty"`
}

type AttendanceRepository interface {
	Create(ctx context.Context, attendance *Attendance) error
	BulkCreate(ctx context.Context, attendances []Attendance) error
	GetByStudent(ctx context.Context, studentID uuid.UUID) ([]Attendance, error)
	GetByClassAndDate(ctx context.Context, classID uuid.UUID, date string) ([]Attendance, error)
	GetAll(ctx context.Context) ([]Attendance, error)
	LogScanEvent(ctx context.Context, scan *ScanEvent) error
	GetRecentScanEvents(ctx context.Context, limit int) ([]ScanEvent, error)

	GetAttendanceStats(ctx context.Context) (map[string]int, error)
	GetStudentAttendanceStats(ctx context.Context) ([]StudentAttendanceStat, error)
}

type StudentAttendanceStat struct {
	StudentID uuid.UUID
	Present   int
	Total     int
}

type AttendanceUseCase interface {
	MarkAttendance(ctx context.Context, attendance *Attendance) error
	MarkBulkAttendance(ctx context.Context, attendances []Attendance) error
	GetStudentAttendance(ctx context.Context, studentID uuid.UUID) ([]Attendance, error)
	GetClassAttendance(ctx context.Context, classID uuid.UUID, date string) ([]Attendance, error)
	AnalyzeAbsences(ctx context.Context, threshold int) error

	// Hardware Integration
	ProcessHardwareScan(ctx context.Context, deviceID, rfidToken string) error
	GetRecentScanEvents(ctx context.Context, limit int) ([]EnrichedScanEvent, error)
}
