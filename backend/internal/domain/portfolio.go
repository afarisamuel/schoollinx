package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// StudentPortfolio is a rich student achievement and profile record
type StudentPortfolio struct {
	TenantBase
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	StudentID   uuid.UUID `json:"student_id" gorm:"type:uuid;not null;uniqueIndex"`
	Bio         string    `json:"bio"`         // Personal statement / about me
	Ambition    string    `json:"ambition"`    // Future career goals
	Skills      string    `json:"skills"`      // Comma-separated list of skills
	Languages   string    `json:"languages"`   // Languages spoken
	HobbiesJson string    `json:"hobbies_json" gorm:"column:hobbies_json"` // JSON array
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	Achievements []PortfolioAchievement `json:"achievements,omitempty" gorm:"foreignKey:PortfolioID"`
}

func (sp *StudentPortfolio) BeforeCreate(tx *gorm.DB) error {
	if sp.ID == uuid.Nil {
		sp.ID = uuid.New()
	}
	return nil
}

// PortfolioAchievement represents a notable accomplishment — award, certificate, project etc.
type PortfolioAchievement struct {
	TenantBase
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	PortfolioID uuid.UUID `json:"portfolio_id" gorm:"type:uuid;not null"`
	Category    string    `json:"category"` // e.g. "Award", "Project", "Certificate", "Sports"
	Title       string    `json:"title" gorm:"not null"`
	Description string    `json:"description"`
	DateEarned  time.Time `json:"date_earned"`
	Issuer      string    `json:"issuer"` // e.g. "Ministry of Education", "School"
	CreatedAt   time.Time `json:"created_at"`
}

func (pa *PortfolioAchievement) BeforeCreate(tx *gorm.DB) error {
	if pa.ID == uuid.Nil {
		pa.ID = uuid.New()
	}
	return nil
}

type PortfolioRepository interface {
	GetByStudent(ctx context.Context, studentID uuid.UUID) (*StudentPortfolio, error)
	Upsert(ctx context.Context, portfolio *StudentPortfolio) error

	AddAchievement(ctx context.Context, achievement *PortfolioAchievement) error
	DeleteAchievement(ctx context.Context, id uuid.UUID) error
	GetAchievements(ctx context.Context, portfolioID uuid.UUID) ([]PortfolioAchievement, error)
}

type PortfolioUseCase interface {
	GetStudentPortfolio(ctx context.Context, studentID uuid.UUID) (*StudentPortfolio, error)
	SaveStudentPortfolio(ctx context.Context, studentID uuid.UUID, portfolio *StudentPortfolio) error
	AddAchievement(ctx context.Context, studentID uuid.UUID, achievement *PortfolioAchievement) error
	DeleteAchievement(ctx context.Context, achievementID uuid.UUID) error
}
