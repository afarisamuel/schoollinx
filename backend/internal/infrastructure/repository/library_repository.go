package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type libraryRepository struct {
	db *gorm.DB
}

func NewLibraryRepository(db *gorm.DB) domain.LibraryRepository {
	return &libraryRepository{db: db}
}

func (r *libraryRepository) CreateBook(ctx context.Context, book *domain.LibraryBook) error {
	return r.db.WithContext(ctx).Create(book).Error
}

func (r *libraryRepository) GetBookByID(ctx context.Context, id uuid.UUID) (*domain.LibraryBook, error) {
	var book domain.LibraryBook
	if err := r.db.WithContext(ctx).First(&book, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &book, nil
}

func (r *libraryRepository) GetBookByBarcode(ctx context.Context, barcode string) (*domain.LibraryBook, error) {
	var book domain.LibraryBook
	if err := r.db.WithContext(ctx).Where("barcode = ?", barcode).First(&book).Error; err != nil {
		return nil, err
	}
	return &book, nil
}

func (r *libraryRepository) GetBooks(ctx context.Context, query string) ([]domain.LibraryBook, error) {
	var books []domain.LibraryBook
	db := r.db.WithContext(ctx)
	if query != "" {
		db = db.Where("title LIKE ? OR author LIKE ? OR isbn LIKE ?", "%"+query+"%", "%"+query+"%", "%"+query+"%")
	}
	err := db.Find(&books).Error
	return books, err
}

func (r *libraryRepository) UpdateBook(ctx context.Context, book *domain.LibraryBook) error {
	return r.db.WithContext(ctx).Save(book).Error
}

func (r *libraryRepository) DeleteBook(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.LibraryBook{}, "id = ?", id).Error
}

func (r *libraryRepository) CreateLoan(ctx context.Context, loan *domain.LibraryLoan) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Update available copies
		var book domain.LibraryBook
		if err := tx.First(&book, loan.BookID).Error; err != nil {
			return err
		}
		if book.AvailableCopies <= 0 {
			return fmt.Errorf("no copies available for loan")
		}
		book.AvailableCopies--
		if err := tx.Save(&book).Error; err != nil {
			return err
		}

		// Create loan
		return tx.Create(loan).Error
	})
}

func (r *libraryRepository) GetLoanByID(ctx context.Context, id uuid.UUID) (*domain.LibraryLoan, error) {
	var loan domain.LibraryLoan
	if err := r.db.WithContext(ctx).Preload("Book").Preload("Student").First(&loan, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &loan, nil
}

func (r *libraryRepository) GetStudentLoans(ctx context.Context, studentID uuid.UUID) ([]domain.LibraryLoan, error) {
	var loans []domain.LibraryLoan
	err := r.db.WithContext(ctx).Preload("Book").Where("student_id = ?", studentID).Find(&loans).Error
	return loans, err
}

func (r *libraryRepository) GetAllActiveLoans(ctx context.Context) ([]domain.LibraryLoan, error) {
	var loans []domain.LibraryLoan
	err := r.db.WithContext(ctx).Preload("Book").Preload("Student").Where("status != ?", domain.LoanStatusReturned).Find(&loans).Error
	return loans, err
}

func (r *libraryRepository) UpdateLoan(ctx context.Context, loan *domain.LibraryLoan) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// If returning, increment available copies
		if loan.Status == domain.LoanStatusReturned {
			var book domain.LibraryBook
			if err := tx.First(&book, loan.BookID).Error; err != nil {
				return err
			}
			book.AvailableCopies++
			if err := tx.Save(&book).Error; err != nil {
				return err
			}
		}
		return tx.Save(loan).Error
	})
}
