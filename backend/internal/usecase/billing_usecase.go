package usecase

import (
	"context"
	"log"
	"time"

	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type BillingUseCase interface {
	RunDailyDunningAndInvoicing(ctx context.Context) error
}

type billingUseCase struct {
	db *gorm.DB
}

func NewBillingUseCase(db *gorm.DB) BillingUseCase {
	return &billingUseCase{db: db}
}

func (u *billingUseCase) RunDailyDunningAndInvoicing(ctx context.Context) error {
	log.Println("Running daily dunning and invoicing job...")

	var tenants []domain.Tenant
	if err := u.db.Where("is_active = ?", true).Find(&tenants).Error; err != nil {
		return err
	}

	for _, tenant := range tenants {
		// 1. Check if BillingDueDate is near or past
		if tenant.BillingDueDate != nil {
			daysUntilDue := int(time.Until(*tenant.BillingDueDate).Hours() / 24)
			
			if daysUntilDue == 3 || daysUntilDue == 0 {
				// Generate invoice
				invoice := domain.PlatformInvoice{
					TenantID:      tenant.ID,
					InvoiceNumber: "INV-" + time.Now().Format("20060102") + "-" + tenant.ID.String()[:8],
					Amount:        tenant.PerStudentPerTermRate * 100, // mock student count
					Status:        domain.InvoiceStatusUnpaid,
					DueDate:       *tenant.BillingDueDate,
				}

				if tenant.FixedPriceOverride > 0 {
					invoice.Amount = tenant.FixedPriceOverride
				}
				if tenant.DiscountPercentage > 0 {
					invoice.Amount = invoice.Amount * (1 - (tenant.DiscountPercentage / 100))
				}

				// Check if invoice already exists for this due date to prevent duplicates
				var count int64
				u.db.Model(&domain.PlatformInvoice{}).Where("tenant_id = ? AND due_date = ?", tenant.ID, invoice.DueDate).Count(&count)
				if count == 0 {
					// In a real scenario, we would use gofpdf to generate a PDF, save it, and set PdfUrl here
					invoice.PdfUrl = "https://storage.schoollinx.com/invoices/" + invoice.InvoiceNumber + ".pdf"
					u.db.Create(&invoice)
					
					// Then we would send an email via MailService to tenant.Email
					log.Printf("Generated invoice %s for tenant %s\n", invoice.InvoiceNumber, tenant.Name)
				}
			}

			if daysUntilDue < 0 {
				// Dunning process: lock tenant if grace period exceeded
				if daysUntilDue < -7 {
					log.Printf("Tenant %s is more than 7 days overdue. Initiating lockout protocol.", tenant.Name)
					// Lock tenant logic here
				} else {
					log.Printf("Tenant %s is overdue. Sending dunning reminder.", tenant.Name)
				}
			}
		}
	}

	return nil
}
