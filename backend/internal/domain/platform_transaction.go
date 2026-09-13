package domain

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// PlatformPaymentRecord represents a unified view of any financial transaction across the platform.
type PlatformPaymentRecord struct {
	ID                    string     `json:"id"`
	Reference             string     `json:"reference"`
	TenantID              string     `json:"tenant_id"`
	TenantName            string     `json:"tenant_name"`
	TenantSubdomain       string     `json:"tenant_subdomain"`
	PayerEmail            string     `json:"payer_email"`
	PayerName             string     `json:"payer_name"`
	PayerRole             string     `json:"payer_role"`
	StudentID             *string    `json:"student_id,omitempty"`
	StudentName           string     `json:"student_name,omitempty"`
	Category              string     `json:"category"` // 'SCHOOL_FEES', 'WALLET_TOPUP', 'TENANT_SUBSCRIPTION', 'SMS_CREDITS', 'DAILY_BILL'
	RoutingType           string     `json:"routing_type"` // 'SUBACCOUNT', 'MAIN_ACCOUNT', 'DIRECT_KEYS'
	SubaccountCode        string     `json:"subaccount_code,omitempty"`
	SettlementDestination string     `json:"settlement_destination"` // e.g. "GCB Bank - 10293848" or "Platform Main Account Vault"
	Amount                float64    `json:"amount"`
	Currency              string     `json:"currency"`
	Status                string     `json:"status"` // 'SUCCESS', 'PENDING', 'FAILED', 'REFUNDED', 'REVERSED'
	Provider              string     `json:"provider"` // 'PAYSTACK'
	IsMisrouted           bool       `json:"is_misrouted"` // True if a school-intended fee/top-up landed in the Main Platform Account
	Reconciled            bool       `json:"reconciled"` // True if super admin remitted/reconciled back to school
	ReconciliationNote    string     `json:"reconciliation_note,omitempty"`
	RemittanceRef         string     `json:"remittance_ref,omitempty"`
	ReconciledAt          *time.Time `json:"reconciled_at,omitempty"`
	ReconciledBy          string     `json:"reconciled_by,omitempty"`
	RefundReason          string     `json:"refund_reason,omitempty"`
	RefundedAt            *time.Time `json:"refunded_at,omitempty"`
	RefundedBy            string     `json:"refunded_by,omitempty"`
	Metadata              string     `json:"metadata,omitempty"`
	CreatedAt             time.Time  `json:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at"`
}

// PlatformPaymentReconciliation stores super-admin reconciliation notes, manual school remittances, and refunds.
type PlatformPaymentReconciliation struct {
	ID                 uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Reference          string     `json:"reference" gorm:"type:varchar(255);uniqueIndex;not null"`
	TenantID           uuid.UUID  `json:"tenant_id" gorm:"type:uuid;index;not null"`
	ReconciliationType string     `json:"reconciliation_type" gorm:"type:varchar(50);not null"` // 'REMITTED_TO_SCHOOL', 'REFUNDED_TO_PAYER', 'MANUAL_ADJUSTMENT'
	IsReconciled       bool       `json:"is_reconciled" gorm:"default:true"`
	RemittanceRef      string     `json:"remittance_ref" gorm:"type:varchar(255)"`
	AdminNotes         string     `json:"admin_notes" gorm:"type:text"`
	ReconciledBy       string     `json:"reconciled_by" gorm:"type:varchar(255)"`
	ReconciledAt       time.Time  `json:"reconciled_at" gorm:"autoCreateTime"`
	RefundReason       string     `json:"refund_reason" gorm:"type:text"`
	RefundedAt         *time.Time `json:"refunded_at"`
	RefundedBy         string     `json:"refunded_by" gorm:"type:varchar(255)"`
	CreatedAt          time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt          time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
}

func (PlatformPaymentReconciliation) TableName() string {
	return "public.platform_payment_reconciliations"
}

func (p *PlatformPaymentReconciliation) BeforeCreate(tx *gorm.DB) (err error) {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return
}

// PlatformFinanceLedgerSummary provides global KPI aggregates for the super-admin financial dashboard.
type PlatformFinanceLedgerSummary struct {
	TotalVolume               float64 `json:"total_volume"`
	SuccessfulVolume          float64 `json:"successful_volume"`
	SubaccountVolume          float64 `json:"subaccount_volume"`
	MainAccountVolume         float64 `json:"main_account_volume"`
	MisroutedUnreconciledVol  float64 `json:"misrouted_unreconciled_volume"`
	MisroutedCount            int     `json:"misrouted_count"`
	TotalTransactionsCount    int     `json:"total_transactions_count"`
	TotalSchoolFeesVolume     float64 `json:"total_school_fees_volume"`
	TotalWalletTopUpVolume    float64 `json:"total_wallet_topup_volume"`
	TotalSaaSSubscriptionVol  float64 `json:"total_saas_subscription_volume"`
	TotalSMSCreditsVolume     float64 `json:"total_sms_credits_volume"`
}
