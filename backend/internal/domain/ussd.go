package domain

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
)

// USSDRequest represents an incoming USSD request from Arkesel, Hubtel, or generic telecom aggregators.
type USSDRequest struct {
	SessionID   string `json:"sessionID" form:"sessionID"`
	UserID      string `json:"userID" form:"userID"`         // MSISDN / Phone Number (e.g., 233501234567)
	MSISDN      string `json:"msisdn" form:"msisdn"`         // Alternative phone field
	PhoneNumber string `json:"phoneNumber" form:"phoneNumber"`
	UserData    string `json:"userData" form:"userData"`     // User input string (e.g. 1, 2, STD-101)
	Message     string `json:"message" form:"message"`       // Alternative input field
	ServiceCode string `json:"serviceCode" form:"serviceCode"` // Short code dialed (e.g., *920*100#)
	Network     string `json:"network" form:"network"`       // MTN, VODAFONE, AIRTELTIGO
	NewSession  bool   `json:"newSession" form:"newSession"` // True on first dial
	Type        string `json:"type" form:"type"`             // Initiation, Response, Release
}

// GetPhoneNumber extracts and cleans the caller's phone number
func (r *USSDRequest) GetPhoneNumber() string {
	phone := r.UserID
	if phone == "" {
		phone = r.MSISDN
	}
	if phone == "" {
		phone = r.PhoneNumber
	}
	phone = strings.TrimSpace(phone)
	phone = strings.TrimPrefix(phone, "+")
	return phone
}

// GetInput extracts and trims the user's current response input
func (r *USSDRequest) GetInput() string {
	input := r.UserData
	if input == "" {
		input = r.Message
	}
	return strings.TrimSpace(input)
}

// USSDResponse represents the response sent back to Arkesel / USSD Gateway
type USSDResponse struct {
	SessionID       string `json:"sessionID"`
	UserID          string `json:"userID,omitempty"`
	Message         string `json:"message"`
	ContinueSession bool   `json:"continueSession"`
}

// USSDStudentSummary holds essential student information shown in USSD menus
type USSDStudentSummary struct {
	StudentID      uuid.UUID `json:"student_id"`
	TenantID       string    `json:"tenant_id"`
	TenantName     string    `json:"tenant_name"`
	TenantSchema   string    `json:"tenant_schema"`
	StudentName    string    `json:"student_name"`
	ClassName      string    `json:"class_name"`
	EnrollmentNum  string    `json:"enrollment_num"`
	BalanceDue     float64   `json:"balance_due"`
	PrepaidBalance float64   `json:"prepaid_balance"`
	FiscalRecordID *uuid.UUID `json:"fiscal_record_id,omitempty"`
}

// USSDSessionState tracks the multi-step USSD conversation flow
type USSDSessionState struct {
	SessionID       string               `json:"session_id"`
	PhoneNumber     string               `json:"phone_number"`
	TenantID        string               `json:"tenant_id"`
	TenantName      string               `json:"tenant_name"`
	TenantSchema    string               `json:"tenant_schema"`
	Step            string               `json:"step"`
	ActionType      string               `json:"action_type"` // FEE_PAYMENT, WALLET_TOPUP, BALANCE_CHECK, STUDENT_SEARCH
	StudentID       *uuid.UUID           `json:"student_id,omitempty"`
	StudentName     string               `json:"student_name"`
	StudentClass    string               `json:"student_class"`
	EnrollmentNum   string               `json:"enrollment_num"`
	BalanceDue      float64              `json:"balance_due"`
	PrepaidBalance  float64              `json:"prepaid_balance"`
	FiscalRecordID  *uuid.UUID           `json:"fiscal_record_id,omitempty"`
	Amount          float64              `json:"amount"`
	MatchedStudents []USSDStudentSummary `json:"matched_students,omitempty"`
	CreatedAt       time.Time            `json:"created_at"`
	UpdatedAt       time.Time            `json:"updated_at"`
}

// USSDUseCase defines operations for handling USSD interactions
type USSDUseCase interface {
	ProcessRequest(ctx context.Context, req *USSDRequest) (*USSDResponse, error)
	GetSession(sessionID string) (*USSDSessionState, bool)
	ClearSession(sessionID string)
}
