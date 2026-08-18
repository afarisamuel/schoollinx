package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure"
	"github.com/user/high-school-management/backend/internal/infrastructure/logger"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type tenantRepository struct {
	db *gorm.DB
}

func NewTenantRepository(db *gorm.DB) domain.TenantRepository {
	return &tenantRepository{db: db}
}

func (r *tenantRepository) Create(ctx context.Context, tenant *domain.Tenant) error {
	return r.db.WithContext(ctx).Create(tenant).Error
}

func (r *tenantRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Tenant, error) {
	var tenant domain.Tenant
	err := r.db.WithContext(ctx).First(&tenant, "id = ?", id).Error
	return &tenant, err
}

func (r *tenantRepository) GetAll(ctx context.Context) ([]domain.Tenant, error) {
	tenants := make([]domain.Tenant, 0)
	err := r.db.WithContext(ctx).Find(&tenants).Error
	return tenants, err
}

func (r *tenantRepository) UpdateStatus(ctx context.Context, id uuid.UUID, isActive bool) error {
	return r.db.WithContext(ctx).Model(&domain.Tenant{}).Where("id = ?", id).Update("is_active", isActive).Error
}

func (r *tenantRepository) GetBySetupToken(ctx context.Context, token string) (*domain.Tenant, error) {
	var tenants []domain.Tenant
	if err := r.db.Find(&tenants).Error; err != nil {
		return nil, err
	}

	for _, tenant := range tenants {
		if tenant.SchemaName == "" || tenant.SchemaName == "public" {
			continue
		}
		if err := infrastructure.ValidateSchemaName(tenant.SchemaName); err != nil {
			logger.Error("Skipping tenant with invalid schema name in federated search", err, zap.String("schema", tenant.SchemaName))
			continue
		}

		// Trace log for debug
		logger.Info("Federated search: Probing schema for token", zap.String("schema", tenant.SchemaName), zap.String("token", token))

		var count int64
		// Target the specific schema's user table
		if err := r.db.Table(tenant.SchemaName+".users").Where("setup_token = ?", token).Count(&count).Error; err == nil && count > 0 {
			return &tenant, nil
		}
	}

	return nil, gorm.ErrRecordNotFound
}
