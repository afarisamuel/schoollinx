package domain

import (
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/pkg/encryption"
	"gorm.io/gorm"
)

type Tenant struct {
	ID               uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	Name             string    `json:"name" binding:"required" gorm:"not null;uniqueIndex"`
	Subdomain        string    `json:"subdomain" binding:"required" gorm:"uniqueIndex"`
	CustomDomain     *string   `json:"custom_domain" gorm:"uniqueIndex"`
	SchemaName       string    `json:"schema_name" gorm:"uniqueIndex"`
	IsActive         bool      `json:"is_active" gorm:"default:true"`
	SubscriptionPlan      string    `json:"subscription_plan" gorm:"default:'BASIC'"` // e.g., BASIC, PRO, USAGE
	PerStudentPerTermRate float64   `json:"per_student_per_term_rate" gorm:"default:0.0"`
	SMSCredits            int       `json:"sms_credits" gorm:"default:0"`
	StorageLimitGB        int       `json:"storage_limit_gb" gorm:"default:5"`
	StorageUsedMB         int       `json:"storage_used_mb" gorm:"default:0"`
	BillingDueDate        *time.Time `json:"billing_due_date"`
	TrialEndsAt           *time.Time `json:"trial_ends_at"`
	DiscountPercentage    float64    `json:"discount_percentage" gorm:"default:0"`
	FixedPriceOverride    float64    `json:"fixed_price_override" gorm:"default:0"`
	NPSScore              int        `json:"nps_score" gorm:"default:0"`
	Require2FA            bool       `json:"require_2fa" gorm:"column:require2_fa;default:false"`
	DPASignedAt           *time.Time `json:"dpa_signed_at"`
	
	// Feature Flags stored as JSON
	FeatureFlags          string    `json:"feature_flags" gorm:"type:jsonb;default:'{}'"`
	
	// School Configuration Profile
	Address          string    `json:"address"`
	ContactNumbers   string    `json:"contact_numbers"`
	Email            string    `json:"email"`
	LogoURL                string    `json:"logo_url"`
	HeadmasterSignatureURL string    `json:"headmaster_signature_url"`

	// Integration
	PaystackPublicKey      string                           `json:"paystack_public_key"`
	PaystackSecretKey      encryption.EncryptedString       `json:"-" gorm:"type:text"`
	PaystackSubaccountCode string                           `json:"paystack_subaccount_code"`
	
	
	// Academic / Grading Configuration
	ClassScoreWeight float32   `json:"class_score_weight" gorm:"default:0.5"`
	ExamScoreWeight  float32   `json:"exam_score_weight" gorm:"default:0.5"`

	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

func (t *Tenant) BeforeCreate(tx *gorm.DB) (err error) {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return
}

// TenantBase defines the structure for all tenant-scoped models.
// It is intentionally empty because tenant isolation is now handled at the schema level.
type TenantBase struct {
	DeletedAt gorm.DeletedAt `json:"deleted_at,omitempty" gorm:"index"`
}
