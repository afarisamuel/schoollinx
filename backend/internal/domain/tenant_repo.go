package domain

import (
	"context"

	"github.com/google/uuid"
)

// TenantRepository provides access to the global tenant registry.
// Defined in the domain layer so that use cases and handlers depend on
// an interface rather than a concrete infrastructure type.
type TenantRepository interface {
	Create(ctx context.Context, tenant *Tenant) error
	GetByID(ctx context.Context, id uuid.UUID) (*Tenant, error)
	GetAll(ctx context.Context) ([]Tenant, error)
	GetBySetupToken(ctx context.Context, token string) (*Tenant, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, isActive bool) error
}
