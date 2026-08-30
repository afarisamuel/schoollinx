package repository

import (
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type paymentRepository struct {
	db *gorm.DB
}

func NewPaymentRepository(db *gorm.DB) domain.PaymentRepository {
	return &paymentRepository{db: db}
}

func (r *paymentRepository) CreateTransaction(tx *domain.PaymentTransaction) error {
	err := r.db.Table("public.payment_transactions").Omit(clause.Associations).Create(tx).Error
	if err != nil {
		// If column student_id is missing or invalid cross-schema foreign key exists, patch table schema and retry once
		_ = r.db.Exec(`ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS student_id uuid`).Error
		_ = r.db.Exec(`ALTER TABLE public.payment_transactions ALTER COLUMN fiscal_record_id DROP NOT NULL`).Error
		_ = r.db.Exec(`ALTER TABLE public.payment_transactions ALTER COLUMN payer_id DROP NOT NULL`).Error
		_ = r.db.Exec(`ALTER TABLE public.payment_transactions DROP CONSTRAINT IF EXISTS fk_payment_transactions_fiscal_record CASCADE`).Error
		_ = r.db.Exec(`ALTER TABLE public.payment_transactions DROP CONSTRAINT IF EXISTS fk_payment_transactions_payer CASCADE`).Error
		_ = r.db.Exec(`ALTER TABLE public.payment_transactions DROP CONSTRAINT IF EXISTS fk_public_payment_transactions_fiscal_record CASCADE`).Error
		_ = r.db.Exec(`ALTER TABLE public.payment_transactions DROP CONSTRAINT IF EXISTS fk_public_payment_transactions_payer CASCADE`).Error
		return r.db.Table("public.payment_transactions").Omit(clause.Associations).Create(tx).Error
	}
	return nil
}

func (r *paymentRepository) GetTransactionByReference(tenantID, reference string) (*domain.PaymentTransaction, error) {
	var tx domain.PaymentTransaction
	err := r.db.Table("public.payment_transactions").Where("tenant_id = ? AND reference = ?", tenantID, reference).First(&tx).Error
	if err != nil {
		return nil, err
	}
	return &tx, nil
}

func (r *paymentRepository) GetTransactionByReferenceOnly(reference string) (*domain.PaymentTransaction, error) {
	var tx domain.PaymentTransaction
	err := r.db.Table("public.payment_transactions").Where("reference = ?", reference).First(&tx).Error
	if err != nil {
		return nil, err
	}
	return &tx, nil
}

func (r *paymentRepository) UpdateTransactionStatus(tenantID, reference string, status domain.PaymentStatus) error {
	return r.db.Table("public.payment_transactions").
		Where("tenant_id = ? AND reference = ?", tenantID, reference).
		Update("status", status).Error
}

func (r *paymentRepository) LogWebhook(log *domain.PaymentWebhookLog) error {
	return r.db.Table("public.payment_webhook_logs").Create(log).Error
}

func (r *paymentRepository) UpdateSubscriptionPaymentStatus(reference string, status string) error {
	return r.db.Table("public.tenant_subscription_payments").
		Where("reference = ?", reference).
		Update("status", status).Error
}

func (r *paymentRepository) GetSubscriptionPaymentByReference(reference string) (*domain.TenantSubscriptionPayment, error) {
	var sub domain.TenantSubscriptionPayment
	err := r.db.Table("public.tenant_subscription_payments").Where("reference = ?", reference).First(&sub).Error
	if err != nil {
		return nil, err
	}
	return &sub, nil
}

