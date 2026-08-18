package domain

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AttendanceStatus string

const (
	StatusPresent AttendanceStatus = "Present"
	StatusAbsent  AttendanceStatus = "Absent"
	StatusTardy   AttendanceStatus = "Tardy"
)

type Attendance struct {
	TenantBase
	ID        uuid.UUID        `json:"id" gorm:"type:uuid;primaryKey"`
	StudentID uuid.UUID        `json:"student_id" gorm:"type:uuid"`
	ClassID   uuid.UUID        `json:"class_id" gorm:"type:uuid"`
	Date      time.Time        `json:"date"`
	Status    AttendanceStatus `json:"status"`
	Remarks   string           `json:"remarks"`
}

func (a *Attendance) BeforeCreate(tx *gorm.DB) (err error) {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return
}

// ScanEvent represents a raw biometric or RFID scan at a school gate/terminal
type ScanEvent struct {
	TenantBase
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	DeviceID  string    `json:"device_id" gorm:"not null;index"`
	RFIDToken string    `json:"rfid_token" gorm:"column:rfid_token;not null;index"`
	Timestamp time.Time `json:"timestamp" gorm:"not null"`
	Processed bool      `json:"processed" gorm:"default:false"`
}

func (s *ScanEvent) BeforeCreate(tx *gorm.DB) (err error) {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return
}
