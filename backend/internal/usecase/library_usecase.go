package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type libraryUseCase struct {
	libraryRepo domain.LibraryRepository
	fiscalRepo  domain.FiscalRepository
}

func NewLibraryUseCase(lrepo domain.LibraryRepository, frepo domain.FiscalRepository) domain.LibraryUseCase {
	return &libraryUseCase{
		libraryRepo: lrepo,
		fiscalRepo:  frepo,
	}
}

func (u *libraryUseCase) AddBook(ctx context.Context, book *domain.LibraryBook) error {
	if book.AvailableCopies == 0 && book.TotalCopies > 0 {
		book.AvailableCopies = book.TotalCopies
	}
	return u.libraryRepo.CreateBook(ctx, book)
}

func (u *libraryUseCase) ListBooks(ctx context.Context, query string) ([]domain.LibraryBook, error) {
	return u.libraryRepo.GetBooks(ctx, query)
}

func (u *libraryUseCase) IssueLoan(ctx context.Context, barcode string, studentID uuid.UUID) (*domain.LibraryLoan, error) {
	// 1. Resolve Book By Barcode
	book, err := u.libraryRepo.GetBookByBarcode(ctx, barcode)
	if err != nil {
		return nil, fmt.Errorf("book not found with barcode: %s", barcode)
	}

	if book.AvailableCopies <= 0 {
		return nil, fmt.Errorf("no available copies for %s", book.Title)
	}

	// 2. Validate Student Standing (Rule: No unpaid fines)
	records, err := u.fiscalRepo.GetByStudent(ctx, studentID)
	if err == nil {
		for _, rec := range records {
			if rec.Status == domain.PaymentStatusPending || rec.Status == domain.PaymentStatusOverdue {
				return nil, fmt.Errorf("checkout blocked: student has outstanding fiscal balance")
			}
		}
	}

	// 3. Validate Loan History (Rule: Max 3 active loans, No overdue loans)
	activeLoans, err := u.libraryRepo.GetStudentLoans(ctx, studentID)
	if err == nil {
		activeCount := 0
		for _, l := range activeLoans {
			if l.Status == domain.LoanStatusOverdue {
				return nil, fmt.Errorf("checkout blocked: student has an overdue book")
			}
			if l.Status == domain.LoanStatusLoaned {
				activeCount++
			}
		}
		if activeCount >= 3 {
			return nil, fmt.Errorf("checkout blocked: max active loan limit (3) reached")
		}
	}

	now := time.Now()
	loan := &domain.LibraryLoan{
		BookID:    book.ID,
		StudentID: studentID,
		LoanDate:  now,
		DueDate:   now.AddDate(0, 0, 14), // Default 14 days loan
		Status:    domain.LoanStatusLoaned,
	}

	if err := u.libraryRepo.CreateLoan(ctx, loan); err != nil {
		return nil, err
	}

	// Preload the book for immediate frontend returning
	loan.Book = book
	return loan, nil
}

func (u *libraryUseCase) ReturnBook(ctx context.Context, loanID uuid.UUID) error {
	loan, err := u.libraryRepo.GetLoanByID(ctx, loanID)
	if err != nil {
		return err
	}

	now := time.Now()
	loan.ReturnedAt = &now
	loan.Status = domain.LoanStatusReturned

	return u.libraryRepo.UpdateLoan(ctx, loan)
}

func (u *libraryUseCase) ListStudentLoans(ctx context.Context, studentID uuid.UUID) ([]domain.LibraryLoan, error) {
	return u.libraryRepo.GetStudentLoans(ctx, studentID)
}

func (u *libraryUseCase) ListActiveLoans(ctx context.Context) ([]domain.LibraryLoan, error) {
	return u.libraryRepo.GetAllActiveLoans(ctx)
}

func (u *libraryUseCase) CheckOverdueLoans(ctx context.Context) error {
	loans, err := u.libraryRepo.GetAllActiveLoans(ctx)
	if err != nil {
		return err
	}

	now := time.Now()
	for _, l := range loans {
		if l.Status == domain.LoanStatusLoaned && l.DueDate.Before(now) {
			l.Status = domain.LoanStatusOverdue
			if err := u.libraryRepo.UpdateLoan(ctx, &l); err != nil {
				return err
			}

			// Generate library fine via Fiscal Ledger
			fine := &domain.FiscalRecord{
				StudentID:   l.StudentID,
				Category:    domain.CategoryLibraryFine,
				Amount:      5.00, // Static fine for now
				Description: "Library fine for overdue book: " + l.Book.Title,
				Status:      domain.PaymentStatusPending,
				DueDate:     now.AddDate(0, 0, 7),
			}
			_ = u.fiscalRepo.Create(ctx, fine)
		}
	}
	return nil
}
