package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type stockRepository struct {
	db *gorm.DB
}

func NewStockRepository(db *gorm.DB) domain.StockRepository {
	return &stockRepository{db: db}
}

func (r *stockRepository) CreateItem(ctx context.Context, item *domain.StockItem) error {
	if item.ID == uuid.Nil {
		item.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(item).Error
}

func (r *stockRepository) GetItem(ctx context.Context, id uuid.UUID) (*domain.StockItem, error) {
	var item domain.StockItem
	if err := r.db.WithContext(ctx).First(&item, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *stockRepository) ListItems(ctx context.Context, tenantID uuid.UUID) ([]*domain.StockItem, error) {
	var items []*domain.StockItem
	if err := r.db.WithContext(ctx).Where("tenant_id = ? AND is_active = true", tenantID).Order("name ASC").Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

func (r *stockRepository) UpdateItem(ctx context.Context, item *domain.StockItem) error {
	return r.db.WithContext(ctx).Save(item).Error
}

func (r *stockRepository) RecordMovement(ctx context.Context, movement *domain.StockMovement) error {
	if movement.ID == uuid.Nil {
		movement.ID = uuid.New()
	}

	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(movement).Error; err != nil {
			return err
		}

		var delta int
		switch movement.Type {
		case domain.StockMovementIn:
			delta = movement.Quantity
		case domain.StockMovementOut:
			delta = -movement.Quantity
		case domain.StockMovementAdjust:
			// For adjust: reset to exact quantity value
			return tx.Model(&domain.StockItem{}).Where("id = ?", movement.ItemID).
				Update("current_quantity", movement.Quantity).Error
		}

		return tx.Model(&domain.StockItem{}).Where("id = ?", movement.ItemID).
			UpdateColumn("current_quantity", gorm.Expr("current_quantity + ?", delta)).Error
	})
}

func (r *stockRepository) GetItemMovements(ctx context.Context, itemID uuid.UUID) ([]*domain.StockMovement, error) {
	var movements []*domain.StockMovement
	if err := r.db.WithContext(ctx).Where("item_id = ?", itemID).Order("created_at DESC").Find(&movements).Error; err != nil {
		return nil, err
	}
	return movements, nil
}

func (r *stockRepository) GetLowStockItems(ctx context.Context, tenantID uuid.UUID) ([]*domain.StockItem, error) {
	var items []*domain.StockItem
	if err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND is_active = true AND current_quantity <= reorder_level", tenantID).
		Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}
