package repository

import (
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type paymentRepository struct {
	db *gorm.DB
}

func NewPaymentRepository(db *gorm.DB) domain.PaymentRepository {
	return &paymentRepository{db: db}
}

func (r *paymentRepository) CreateTransaction(tx *domain.PaymentTransaction) error {
	return r.db.Create(tx).Error
}

func (r *paymentRepository) GetTransactionByReference(tenantID, reference string) (*domain.PaymentTransaction, error) {
	var tx domain.PaymentTransaction
	err := r.db.Where("tenant_id = ? AND reference = ?", tenantID, reference).First(&tx).Error
	if err != nil {
		return nil, err
	}
	return &tx, nil
}

func (r *paymentRepository) GetTransactionByReferenceOnly(reference string) (*domain.PaymentTransaction, error) {
	var tx domain.PaymentTransaction
	err := r.db.Where("reference = ?", reference).First(&tx).Error
	if err != nil {
		return nil, err
	}
	return &tx, nil
}

func (r *paymentRepository) UpdateTransactionStatus(tenantID, reference string, status domain.PaymentStatus) error {
	return r.db.Model(&domain.PaymentTransaction{}).
		Where("tenant_id = ? AND reference = ?", tenantID, reference).
		Update("status", status).Error
}

func (r *paymentRepository) LogWebhook(log *domain.PaymentWebhookLog) error {
	return r.db.Create(log).Error
}

func (r *paymentRepository) UpdateSubscriptionPaymentStatus(reference string, status string) error {
	return r.db.Table("public.tenant_subscription_payments").
		Where("reference = ?", reference).
		Update("status", status).Error
}

