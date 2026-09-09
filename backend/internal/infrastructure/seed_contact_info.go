package infrastructure

import (
	"log"
	"time"

	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

// SeedDefaultContactInfo ensures default dynamic company contact info is present.
func SeedDefaultContactInfo(db *gorm.DB) {
	var count int64
	if err := db.Model(&domain.CompanyContactInfo{}).Count(&count).Error; err != nil || count > 0 {
		return
	}

	info := domain.CompanyContactInfo{
		ID:                   1,
		SalesEmail:           "sales@schoollinx.com",
		SalesTitle:           "Institutional Sales",
		SalesDesc:            "Discuss school migration, pricing tiers & demos.",
		SupportEmail:         "support@schoollinx.com",
		SupportTitle:         "Technical Support Concierge",
		SupportDesc:          "Assistance for headmasters, ICT coordinators & bursars.",
		GeneralEmail:         "info@schoollinx.com",
		DpoEmail:             "privacy@schoollinx.com",
		PrimaryPhone:         "+233 24 412 3456",
		PhoneTitle:           "Direct Telephone & WhatsApp",
		OperatingHours:       "Monday to Friday, 8:00 AM – 5:00 PM GMT",
		WhatsAppNumber:       "+233244123456",
		EmergencyHotline:     "+233 20 000 1122",
		HeadquartersTitle:    "Regional Headquarters",
		HeadquartersSubtitle: "West Africa Technology Innovation Hub",
		HeadquartersAddress:  "Accra • Lagos • Nairobi",
		FullAddress:          "12 Independence Avenue, Ridge, Accra, Ghana",
		TwitterUrl:           "https://twitter.com",
		LinkedInUrl:          "https://linkedin.com",
		GitHubUrl:            "https://github.com",
		YouTubeUrl:           "https://youtube.com",
		FacebookUrl:          "https://facebook.com",
		UpdatedAt:            time.Now(),
	}

	if err := db.Create(&info).Error; err != nil {
		log.Printf("Failed to seed default contact info: %v", err)
	} else {
		log.Println("Seeded default company contact information.")
	}
}
