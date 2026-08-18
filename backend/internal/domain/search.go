package domain

import (
	"context"

	"github.com/google/uuid"
)

type SearchResult struct {
	TenantBase
	Type  string    `json:"type"` // student, teacher, class, page
	ID    uuid.UUID `json:"id"`
	Title string    `json:"title"`
	Path  string    `json:"path"`
}

type SearchUseCase interface {
	Search(ctx context.Context, query string) ([]SearchResult, error)
}
