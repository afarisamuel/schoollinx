package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// HealthRecord tracks a student's medical information
type HealthRecord struct {
	TenantBase
	ID                 uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	StudentID          uuid.UUID `json:"student_id" gorm:"type:uuid;not null"`
	Allergies          string    `json:"allergies"`
	MedicalConditions  string    `json:"medical_conditions"`
	RequiredMedication string    `json:"required_medication"`
	EmergencyContact   string    `json:"emergency_contact"`
	BloodGroup         string    `json:"blood_group"`
	UpdatedAt          time.Time `json:"updated_at"`
	CreatedAt          time.Time `json:"created_at"`
}

// BehaviorLog tracks a student's disciplinary or merit events
type BehaviorLog struct {
	TenantBase
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	StudentID   uuid.UUID `json:"student_id" gorm:"type:uuid;not null"`
	ReportedBy  uuid.UUID `json:"reported_by" gorm:"type:uuid"` // e.g. TeacherID
	Type        string    `json:"type" gorm:"not null"`         // "MERIT" or "DEMERIT"
	Category    string    `json:"category"`                     // e.g. "Outstanding Work", "Disruptive Behavior"
	Description string    `json:"description" gorm:"not null"`
	ActionTaken string    `json:"action_taken"`
	Date        time.Time `json:"date" gorm:"not null"`
	CreatedAt   time.Time `json:"created_at"`
}

// SickbayVisit tracks campus infirmary treatments, fever alerts, and medications (Feature 17)
type SickbayVisit struct {
	TenantBase
	ID                 uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	StudentID          uuid.UUID  `json:"student_id" gorm:"type:uuid;not null;index"`
	Student            *Student   `json:"student,omitempty" gorm:"foreignKey:StudentID"`
	AttendingNurse     string     `json:"attending_nurse" gorm:"not null"`
	Symptoms           string     `json:"symptoms" gorm:"not null"`
	Diagnosis          string     `json:"diagnosis"`
	TemperatureCelsius float64    `json:"temperature_celsius"`
	MedicationGiven    string     `json:"medication_given"`
	FeverAlert         bool       `json:"fever_alert" gorm:"default:false"`
	ParentNotified     bool       `json:"parent_notified" gorm:"default:false"`
	RestStart          time.Time  `json:"rest_start"`
	DischargedAt       *time.Time `json:"discharged_at"`
	CreatedAt          time.Time  `json:"created_at"`
}

type WelfareRepository interface {
	// Health Records
	GetHealthRecord(ctx context.Context, studentID uuid.UUID) (*HealthRecord, error)
	UpsertHealthRecord(ctx context.Context, record *HealthRecord) error

	// Sickbay EMR (Feature 17)
	CreateSickbayVisit(ctx context.Context, visit *SickbayVisit) error
	GetSickbayVisitsByStudent(ctx context.Context, studentID uuid.UUID) ([]SickbayVisit, error)

	// Behavior Logs
	GetBehaviorLogs(ctx context.Context, studentID uuid.UUID) ([]BehaviorLog, error)
	CreateBehaviorLog(ctx context.Context, log *BehaviorLog) error
	DeleteBehaviorLog(ctx context.Context, id uuid.UUID) error
}

type WelfareUseCase interface {
	// Health Records
	GetStudentHealth(ctx context.Context, studentID uuid.UUID) (*HealthRecord, error)
	UpdateStudentHealth(ctx context.Context, record *HealthRecord) error

	// Sickbay EMR (Feature 17)
	RecordSickbayVisit(ctx context.Context, visit *SickbayVisit) error
	GetStudentSickbayVisits(ctx context.Context, studentID uuid.UUID) ([]SickbayVisit, error)

	// Behavior Logs
	GetStudentBehavior(ctx context.Context, studentID uuid.UUID) ([]BehaviorLog, error)
	LogBehaviorEvent(ctx context.Context, log *BehaviorLog) error
	RemoveBehaviorEvent(ctx context.Context, id uuid.UUID) error
}
