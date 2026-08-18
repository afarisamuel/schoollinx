package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type ProcurementUseCase struct {
	repo domain.ProcurementRepository
}

func NewProcurementUseCase(repo domain.ProcurementRepository) *ProcurementUseCase {
	return &ProcurementUseCase{repo: repo}
}

func (u *ProcurementUseCase) AddSupplier(ctx context.Context, supplier *domain.Supplier) error {
	return u.repo.CreateSupplier(ctx, supplier)
}

func (u *ProcurementUseCase) ListSuppliers(ctx context.Context, tenantID uuid.UUID) ([]*domain.Supplier, error) {
	return u.repo.ListSuppliers(ctx, tenantID)
}

func (u *ProcurementUseCase) CreatePO(ctx context.Context, po *domain.PurchaseOrder) error {
	po.Status = domain.POStatusDraft
	return u.repo.CreatePO(ctx, po)
}

func (u *ProcurementUseCase) ApprovePO(ctx context.Context, id uuid.UUID) error {
	return u.repo.UpdatePOStatus(ctx, id, domain.POStatusApproved)
}

func (u *ProcurementUseCase) ReceivePO(ctx context.Context, id uuid.UUID) error {
	return u.repo.UpdatePOStatus(ctx, id, domain.POStatusReceived)
}

func (u *ProcurementUseCase) CancelPO(ctx context.Context, id uuid.UUID) error {
	return u.repo.UpdatePOStatus(ctx, id, domain.POStatusCancelled)
}

func (u *ProcurementUseCase) ListPOs(ctx context.Context, tenantID uuid.UUID) ([]*domain.PurchaseOrder, error) {
	return u.repo.ListPOs(ctx, tenantID)
}

func (u *ProcurementUseCase) GetPO(ctx context.Context, id uuid.UUID) (*domain.PurchaseOrder, error) {
	return u.repo.GetPO(ctx, id)
}
