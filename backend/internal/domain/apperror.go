package domain

import "fmt"

// Standard application error codes for structured API responses.
const (
	ErrCodeAuthInvalidCredentials = "AUTH_INVALID_CREDENTIALS"
	ErrCodeAuthTokenExpired       = "AUTH_TOKEN_EXPIRED"
	ErrCodeAuthTokenMissing       = "AUTH_TOKEN_MISSING"
	ErrCodeEntityNotFound         = "ENTITY_NOT_FOUND"
	ErrCodeValidationFailed       = "VALIDATION_FAILED"
	ErrCodeTenantNotFound         = "TENANT_NOT_FOUND"
	ErrCodeAccessDenied           = "ACCESS_DENIED"
	ErrCodeRateLimited            = "RATE_LIMITED"
	ErrCodeInternal               = "INTERNAL_ERROR"
	ErrCodeConflict               = "CONFLICT"
	ErrCodeAlreadyProcessed       = "ALREADY_PROCESSED"
	ErrCodeAlreadyPaid            = "ALREADY_PAID"
	ErrCodeInsufficientFunds      = "INSUFFICIENT_FUNDS"
	ErrCodeDuplicateFee           = "DUPLICATE_FEE"
)

// AppError is a structured application error that maps to an HTTP status and
// machine-readable error code. Handlers should return these so the global
// error middleware can serialize a consistent JSON envelope.
type AppError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Status  int    `json:"-"`
}

func (e *AppError) Error() string {
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

// NewAppError creates a new application error.
func NewAppError(status int, code, message string) *AppError {
	return &AppError{
		Code:    code,
		Message: message,
		Status:  status,
	}
}
