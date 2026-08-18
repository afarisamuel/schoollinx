package domain

import "github.com/google/uuid"

type RiskLevel string

const (
	RiskLevelHigh   RiskLevel = "HIGH"
	RiskLevelMedium RiskLevel = "MEDIUM"
	RiskLevelLow    RiskLevel = "LOW"
)

type RiskAlert struct {
	Reasons       []string  `json:"reasons"`
	StudentName   string    `json:"student_name"`
	Level         RiskLevel `json:"level"`
	GradeAvg      float32   `json:"grade_avg"`
	AttendancePct float32   `json:"attendance_pct"`
	RiskScore     float32   `json:"risk_score"`
	StudentID     uuid.UUID `json:"student_id"`
	TenantBase
}

type AttendanceAnomaly struct {
	StudentID     uuid.UUID `json:"student_id"`
	StudentName   string    `json:"student_name"`
	AnomalyType   string    `json:"anomaly_type"` // e.g. "CONSECUTIVE_ABSENCE", "DROP_IN_ATTENDANCE"
	Description   string    `json:"description"`
	DateDetected  string    `json:"date_detected"`
	Severity      RiskLevel `json:"severity"`
	TenantBase
}
