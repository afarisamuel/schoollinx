package repository

import (
	"context"
	"time"

	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type tokenBlacklistRepository struct {
	db *gorm.DB
}

func NewTokenBlacklistRepository(db *gorm.DB) domain.TokenBlacklistRepository {
	return &tokenBlacklistRepository{db: db}
}

func (r *tokenBlacklistRepository) RevokeToken(ctx context.Context, jti string, expiresAt time.Time) error {
	revoked := &domain.RevokedToken{
		JTI:       jti,
		ExpiresAt: expiresAt,
	}
	// Explicitly save in public schema to avoid tenant isolation issues
	return r.db.WithContext(ctx).Table("public.revoked_tokens").Create(revoked).Error
}

func (r *tokenBlacklistRepository) IsRevoked(ctx context.Context, jti string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Table("public.revoked_tokens").Where("jti = ?", jti).Count(&count).Error
	return count > 0, err
}

func (r *tokenBlacklistRepository) CleanupExpired(ctx context.Context) error {
	return r.db.WithContext(ctx).Table("public.revoked_tokens").Where("expires_at < ?", time.Now()).Delete(nil).Error
}
