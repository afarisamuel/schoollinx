package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type LoanStatus string

const (
	LoanStatusLoaned   LoanStatus = "LOANED"
	LoanStatusReturned LoanStatus = "RETURNED"
	LoanStatusOverdue  LoanStatus = "OVERDUE"
)

type LibraryBook struct {
	TenantBase
	ID              uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	ISBN            string    `json:"isbn" gorm:"unique;not null"`
	Barcode         string    `json:"barcode" gorm:"unique;not null"`
	Title           string    `json:"title" gorm:"not null"`
	Author          string    `json:"author" gorm:"not null"`
	Category        string    `json:"category"`
	TotalCopies     int       `json:"total_copies" gorm:"default:1"`
	AvailableCopies int       `json:"available_copies" gorm:"default:1"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

func (b *LibraryBook) BeforeCreate(tx *gorm.DB) (err error) {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return
}

type LibraryLoan struct {
	TenantBase
	ID         uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey"`
	BookID     uuid.UUID  `json:"book_id" gorm:"type:uuid;not null"`
	StudentID  uuid.UUID  `json:"student_id" gorm:"type:uuid;not null"`
	LoanDate   time.Time  `json:"loan_date" gorm:"not null"`
	DueDate    time.Time  `json:"due_date" gorm:"not null"`
	ReturnedAt *time.Time `json:"returned_at,omitempty"`
	Status     LoanStatus `json:"status" gorm:"default:LOANED"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`

	// Relations
	Book    *LibraryBook `json:"book,omitempty" gorm:"foreignKey:BookID"`
	Student *Student     `json:"student,omitempty" gorm:"foreignKey:StudentID"`
}

func (l *LibraryLoan) BeforeCreate(tx *gorm.DB) (err error) {
	if l.ID == uuid.Nil {
		l.ID = uuid.New()
	}
	return
}

type LibraryRepository interface {
	// Books
	CreateBook(ctx context.Context, book *LibraryBook) error
	GetBookByID(ctx context.Context, id uuid.UUID) (*LibraryBook, error)
	GetBookByBarcode(ctx context.Context, barcode string) (*LibraryBook, error)
	GetBooks(ctx context.Context, query string) ([]LibraryBook, error)
	UpdateBook(ctx context.Context, book *LibraryBook) error
	DeleteBook(ctx context.Context, id uuid.UUID) error

	// Loans
	CreateLoan(ctx context.Context, loan *LibraryLoan) error
	GetLoanByID(ctx context.Context, id uuid.UUID) (*LibraryLoan, error)
	GetStudentLoans(ctx context.Context, studentID uuid.UUID) ([]LibraryLoan, error)
	GetAllActiveLoans(ctx context.Context) ([]LibraryLoan, error)
	UpdateLoan(ctx context.Context, loan *LibraryLoan) error
}

type LibraryUseCase interface {
	// Books
	AddBook(ctx context.Context, book *LibraryBook) error
	ListBooks(ctx context.Context, query string) ([]LibraryBook, error)

	// Circulation
	IssueLoan(ctx context.Context, barcode string, studentID uuid.UUID) (*LibraryLoan, error)
	ReturnBook(ctx context.Context, loanID uuid.UUID) error
	ListStudentLoans(ctx context.Context, studentID uuid.UUID) ([]LibraryLoan, error)
	ListActiveLoans(ctx context.Context) ([]LibraryLoan, error)
	CheckOverdueLoans(ctx context.Context) error
}
