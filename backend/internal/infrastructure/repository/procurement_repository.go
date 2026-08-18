package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type procurementRepository struct {
	db *gorm.DB
}

func NewProcurementRepository(db *gorm.DB) domain.ProcurementRepository {
	return &procurementRepository{db: db}
}

func (r *procurementRepository) CreateSupplier(ctx context.Context, supplier *domain.Supplier) error {
	if supplier.ID == uuid.Nil {
		supplier.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(supplier).Error
}

func (r *procurementRepository) ListSuppliers(ctx context.Context, tenantID uuid.UUID) ([]*domain.Supplier, error) {
	var suppliers []*domain.Supplier
	if err := r.db.WithContext(ctx).Where("tenant_id = ?", tenantID).Order("name ASC").Find(&suppliers).Error; err != nil {
		return nil, err
	}
	return suppliers, nil
}

func (r *procurementRepository) CreatePO(ctx context.Context, po *domain.PurchaseOrder) error {
	if po.ID == uuid.Nil {
		po.ID = uuid.New()
	}
	if po.PONumber == "" {
		po.PONumber = fmt.Sprintf("PO-%d%02d-%04d", time.Now().Year(), time.Now().Month(), time.Now().UnixNano()%10000)
	}
	for i := range po.Items {
		if po.Items[i].ID == uuid.Nil {
			po.Items[i].ID = uuid.New()
		}
		po.Items[i].POID = po.ID
		po.Items[i].TotalPrice = po.Items[i].UnitPrice * float64(po.Items[i].Quantity)
	}

	// Recalculate total
	total := 0.0
	for _, item := range po.Items {
		total += item.TotalPrice
	}
	po.TotalAmount = total

	return r.db.WithContext(ctx).Create(po).Error
}

func (r *procurementRepository) GetPO(ctx context.Context, id uuid.UUID) (*domain.PurchaseOrder, error) {
	var po domain.PurchaseOrder
	if err := r.db.WithContext(ctx).Preload("Items").First(&po, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &po, nil
}

func (r *procurementRepository) ListPOs(ctx context.Context, tenantID uuid.UUID) ([]*domain.PurchaseOrder, error) {
	var pos []*domain.PurchaseOrder
	if err := r.db.WithContext(ctx).Where("tenant_id = ?", tenantID).Order("created_at DESC").Find(&pos).Error; err != nil {
		return nil, err
	}
	return pos, nil
}

func (r *procurementRepository) UpdatePOStatus(ctx context.Context, id uuid.UUID, status domain.PurchaseOrderStatus) error {
	updates := map[string]interface{}{"status": status}
	if status == domain.POStatusReceived {
		now := time.Now()
		updates["received_at"] = now
	}
	return r.db.WithContext(ctx).Model(&domain.PurchaseOrder{}).Where("id = ?", id).Updates(updates).Error
}
