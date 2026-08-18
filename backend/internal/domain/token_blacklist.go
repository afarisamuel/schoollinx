package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// RevokedToken represents a blacklisted JWT (identified by its JTI claim)
type RevokedToken struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	JTI       string    `json:"jti" gorm:"type:varchar(255);uniqueIndex;not null"`
	ExpiresAt time.Time `json:"expires_at" gorm:"not null;index"`
	RevokedAt time.Time `json:"revoked_at" gorm:"autoCreateTime"`
}

type TokenBlacklistRepository interface {
	RevokeToken(ctx context.Context, jti string, expiresAt time.Time) error
	IsRevoked(ctx context.Context, jti string) (bool, error)
	CleanupExpired(ctx context.Context) error
}
