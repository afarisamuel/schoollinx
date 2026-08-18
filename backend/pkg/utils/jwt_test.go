package utils

import (
	"testing"

	"github.com/user/high-school-management/backend/config"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/google/uuid"
)

func TestGenerateAndValidateToken(t *testing.T) {
	cfg := &config.Config{
		JWTSecret: "test_secret_key_123",
	}

	user := &domain.User{
		ID:   uuid.New(),
		Role: domain.RoleAdmin,
	}

	token, err := GenerateToken(user, cfg)
	if err != nil {
		t.Fatalf("Expected no error generating token, got: %v", err)
	}
	if token == "" {
		t.Fatal("Expected token, got empty string")
	}

	claims, err := ValidateToken(token, cfg)
	if err != nil {
		t.Fatalf("Expected no error validating token, got: %v", err)
	}

	if claims.UserID != user.ID {
		t.Errorf("Expected UserID %v, got %v", user.ID, claims.UserID)
	}
	if claims.Role != user.Role {
		t.Errorf("Expected Role %v, got %v", user.Role, claims.Role)
	}
}

func TestGenerateToken_EmptySecret(t *testing.T) {
	cfg := &config.Config{
		JWTSecret: "", // Should fail fast
	}
	user := &domain.User{
		ID:   uuid.New(),
		Role: domain.RoleAdmin,
	}

	_, err := GenerateToken(user, cfg)
	if err == nil {
		t.Fatal("Expected error generating token with empty secret, got nil")
	}
}

func TestValidateToken_EmptySecret(t *testing.T) {
	cfg := &config.Config{
		JWTSecret: "", // Should fail fast
	}
	_, err := ValidateToken("some.fake.token", cfg)
	if err == nil {
		t.Fatal("Expected error validating token with empty secret, got nil")
	}
}

func TestValidateToken_InvalidSignature(t *testing.T) {
	cfg1 := &config.Config{JWTSecret: "secret1"}
	cfg2 := &config.Config{JWTSecret: "secret2"}

	user := &domain.User{ID: uuid.New(), Role: domain.RoleAdmin}

	token, _ := GenerateToken(user, cfg1)

	_, err := ValidateToken(token, cfg2)
	if err == nil {
		t.Fatal("Expected error when validating with wrong secret")
	}
}
