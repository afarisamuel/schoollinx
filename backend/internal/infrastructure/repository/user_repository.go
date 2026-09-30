package repository

import (
	"context"

	"strings"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/pkg/encryption"
	"gorm.io/gorm"
)

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) domain.UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) GetAll(ctx context.Context) ([]domain.User, error) {
	var users []domain.User
	err := r.db.WithContext(ctx).Find(&users).Error
	return users, err
}

func (r *userRepository) GetByRole(ctx context.Context, role domain.Role) ([]domain.User, error) {
	var users []domain.User
	err := r.db.WithContext(ctx).Where("role = ?", role).Find(&users).Error
	return users, err
}

func (r *userRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	var user domain.User
	err := r.db.WithContext(ctx).First(&user, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) GetByIdentifier(ctx context.Context, identifier string) (*domain.User, error) {
	trimmed := strings.TrimSpace(identifier)
	if trimmed == "" {
		return nil, gorm.ErrRecordNotFound
	}

	candidates := map[string]bool{
		trimmed:                  true,
		strings.ToLower(trimmed): true,
	}

	// Normalize phone number variations
	clean := strings.ReplaceAll(trimmed, " ", "")
	clean = strings.ReplaceAll(clean, "-", "")
	clean = strings.ReplaceAll(clean, "(", "")
	clean = strings.ReplaceAll(clean, ")", "")
	clean = strings.ReplaceAll(clean, ".", "")
	candidates[clean] = true

	digits := strings.TrimPrefix(clean, "+")
	if len(digits) == 10 && strings.HasPrefix(digits, "0") {
		// e.g. 0241234567 -> 233241234567, +233241234567, phone_0241234567@no-email.local
		candidates[digits] = true
		candidates["233"+digits[1:]] = true
		candidates["+233"+digits[1:]] = true
		candidates["phone_"+digits+"@no-email.local"] = true
		candidates["phone_233"+digits[1:]+"@no-email.local"] = true
	} else if len(digits) == 12 && strings.HasPrefix(digits, "233") {
		// e.g. 233241234567 -> 0241234567, +233241234567
		candidates[digits] = true
		candidates["0"+digits[3:]] = true
		candidates["+"+digits] = true
		candidates["phone_0"+digits[3:]+"@no-email.local"] = true
		candidates["phone_"+digits+"@no-email.local"] = true
	} else if len(digits) == 9 {
		// e.g. 241234567 -> 0241234567, 233241234567, +233241234567
		candidates["0"+digits] = true
		candidates["233"+digits] = true
		candidates["+233"+digits] = true
		candidates["phone_0"+digits+"@no-email.local"] = true
	}

	var encryptedCandidates []string
	for c := range candidates {
		if c == "" {
			continue
		}
		if enc, err := encryption.EncryptDeterministic(c, ""); err == nil && enc != "" {
			encryptedCandidates = append(encryptedCandidates, enc)
		}
	}

	if len(encryptedCandidates) == 0 {
		return nil, gorm.ErrRecordNotFound
	}

	var user domain.User
	err := r.db.WithContext(ctx).
		Where("email IN (?) OR username IN (?) OR phone_number IN (?)", encryptedCandidates, encryptedCandidates, encryptedCandidates).
		First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) GetBySetupToken(ctx context.Context, token string) (*domain.User, error) {
	var user domain.User
	err := r.db.WithContext(ctx).Where("setup_token = ?", token).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) GetByResetToken(ctx context.Context, token string) (*domain.User, error) {
	var user domain.User
	err := r.db.WithContext(ctx).Where("reset_token = ?", token).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) Create(ctx context.Context, user *domain.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

func (r *userRepository) Update(ctx context.Context, user *domain.User) error {
	return r.db.WithContext(ctx).Save(user).Error
}
