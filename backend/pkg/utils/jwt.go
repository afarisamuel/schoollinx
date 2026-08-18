package utils

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/config"
	"github.com/user/high-school-management/backend/internal/domain"
)

type Claims struct {
	Permissions      []string    `json:"permissions,omitempty"`
	Role             domain.Role `json:"role"`
	UserID           uuid.UUID   `json:"user_id"`
	TwoFactorPending bool        `json:"two_factor_pending,omitempty"`
	ImpersonatorID   uuid.UUID   `json:"impersonator_id,omitempty"`
	TenantSubdomain  string      `json:"tenant_subdomain,omitempty"`
	jwt.RegisteredClaims
}

func GenerateToken(user *domain.User, cfg *config.Config) (string, error) {
	return GenerateTokenWithOptions(user, cfg, false)
}

func Generate2FAToken(user *domain.User, cfg *config.Config) (string, error) {
	return GenerateTokenWithOptions(user, cfg, true)
}

func GenerateTokenWithOptions(user *domain.User, cfg *config.Config, twoFactorPending bool) (string, error) {
	if cfg.JWTSecret == "" {
		return "", fmt.Errorf("JWTSecret is not configured")
	}

	// If it's a 2FA pending token, it expires in 5 minutes
	expirationTime := time.Now().Add(200 * time.Hour)
	if twoFactorPending {
		expirationTime = time.Now().Add(5 * time.Minute)
	}

	permissions := domain.GetPermissionsForUser(user)
	jti := uuid.New().String()

	claims := &Claims{
		UserID:           user.ID,
		Role:             user.Role,
		Permissions:      permissions,
		TwoFactorPending: twoFactorPending,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ID:        jti,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	secret := []byte(cfg.JWTSecret)
	return token.SignedString(secret)
}

func GenerateImpersonationToken(user *domain.User, tenant *domain.Tenant, impersonatorID uuid.UUID, cfg *config.Config) (string, error) {
	if cfg.JWTSecret == "" {
		return "", fmt.Errorf("JWTSecret is not configured")
	}

	expirationTime := time.Now().Add(2 * time.Hour) // Shorter expiration for impersonation
	permissions := domain.GetPermissionsForUser(user)
	jti := uuid.New().String()

	claims := &Claims{
		UserID:           user.ID,
		Role:             user.Role,
		Permissions:      permissions,
		TwoFactorPending: false,
		ImpersonatorID:   impersonatorID,
		TenantSubdomain:  tenant.Subdomain,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ID:        jti,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	secret := []byte(cfg.JWTSecret)
	return token.SignedString(secret)
}

func ValidateToken(tokenString string, cfg *config.Config) (*Claims, error) {
	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("JWTSecret is not configured")
	}
	secret := []byte(cfg.JWTSecret)

	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return secret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}
	return nil, fmt.Errorf("invalid token")
}
