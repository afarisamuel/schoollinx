package usecase

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
)

type documentUseCase struct {
	repo       domain.DocumentRepository
	storageDir string
}

func NewDocumentUseCase(repo domain.DocumentRepository, storageDir string) domain.DocumentUseCase {
	// Ensure base storage directory exists
	if err := os.MkdirAll(storageDir, 0755); err != nil {
		panic(fmt.Sprintf("failed to create document storage directory: %v", err))
	}

	return &documentUseCase{
		repo:       repo,
		storageDir: storageDir,
	}
}

func (u *documentUseCase) UploadDocument(ctx context.Context, doc *domain.Document, fileBytes []byte) error {
	tenantSchema, ok := middleware.GetTenantSchemaFromContext(ctx)
	if !ok || tenantSchema == "" {
		return fmt.Errorf("tenant schema not found in context")
	}

	// Create tenant-specific storage directory
	tenantStorageDir := filepath.Join(u.storageDir, tenantSchema)
	if err := os.MkdirAll(tenantStorageDir, 0755); err != nil {
		return fmt.Errorf("failed to create tenant storage directory: %w", err)
	}

	// Generate a unique filename and store it in the tenant's directory
	filename := fmt.Sprintf("%s_%s", uuid.New().String(), filepath.Base(doc.Title))
	doc.StoragePath = filepath.Join(tenantStorageDir, filename)
	doc.FileSize = int64(len(fileBytes))

	// Write file to local filesystem using os.WriteFile
	if err := os.WriteFile(doc.StoragePath, fileBytes, 0644); err != nil {
		return fmt.Errorf("failed to write file: %w", err)
	}

	// Save metadata to database
	if err := u.repo.Create(ctx, doc); err != nil {
		// Clean up file if db save fails
		_ = os.Remove(doc.StoragePath)
		return err
	}

	return nil
}

func (u *documentUseCase) GetDocument(ctx context.Context, id uuid.UUID) (*domain.Document, error) {
	return u.repo.GetByID(ctx, id)
}

func (u *documentUseCase) GetDocumentsByOwner(ctx context.Context, ownerID uuid.UUID) ([]domain.Document, error) {
	return u.repo.GetByOwner(ctx, ownerID)
}

func (u *documentUseCase) DownloadDocument(ctx context.Context, id uuid.UUID) (*domain.Document, []byte, error) {
	doc, err := u.repo.GetByID(ctx, id)
	if err != nil {
		return nil, nil, err
	}

	fileBytes, err := os.ReadFile(doc.StoragePath)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read file from storage: %w", err)
	}

	return doc, fileBytes, nil
}

func (u *documentUseCase) DeleteDocument(ctx context.Context, id uuid.UUID) error {
	doc, err := u.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// Delete file from local filesystem
	_ = os.Remove(doc.StoragePath)

	// Delete metadata from database
	return u.repo.Delete(ctx, id)
}
