package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type StockUseCase struct {
	repo domain.StockRepository
}

func NewStockUseCase(repo domain.StockRepository) *StockUseCase {
	return &StockUseCase{repo: repo}
}

func (u *StockUseCase) AddItem(ctx context.Context, item *domain.StockItem) error {
	return u.repo.CreateItem(ctx, item)
}

func (u *StockUseCase) ListItems(ctx context.Context, tenantID uuid.UUID) ([]*domain.StockItem, error) {
	return u.repo.ListItems(ctx, tenantID)
}

func (u *StockUseCase) RecordIn(ctx context.Context, movement *domain.StockMovement) error {
	movement.Type = domain.StockMovementIn
	return u.repo.RecordMovement(ctx, movement)
}

func (u *StockUseCase) RecordOut(ctx context.Context, movement *domain.StockMovement) error {
	movement.Type = domain.StockMovementOut
	return u.repo.RecordMovement(ctx, movement)
}

func (u *StockUseCase) Adjust(ctx context.Context, movement *domain.StockMovement) error {
	movement.Type = domain.StockMovementAdjust
	return u.repo.RecordMovement(ctx, movement)
}

func (u *StockUseCase) GetLowStock(ctx context.Context, tenantID uuid.UUID) ([]*domain.StockItem, error) {
	return u.repo.GetLowStockItems(ctx, tenantID)
}

func (u *StockUseCase) GetMovements(ctx context.Context, itemID uuid.UUID) ([]*domain.StockMovement, error) {
	return u.repo.GetItemMovements(ctx, itemID)
}
