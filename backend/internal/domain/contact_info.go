package domain

import "time"

// CompanyContactInfo stores dynamic public contact details and social handles.
type CompanyContactInfo struct {
	ID                   uint      `json:"id" gorm:"primaryKey;default:1"`
	SalesEmail           string    `json:"sales_email" gorm:"type:varchar(255);default:'sales@schoollinx.com'"`
	SalesTitle           string    `json:"sales_title" gorm:"type:varchar(255);default:'Institutional Sales'"`
	SalesDesc            string    `json:"sales_desc" gorm:"type:text;default:'Discuss school migration, pricing tiers & demos.'"`
	SupportEmail         string    `json:"support_email" gorm:"type:varchar(255);default:'support@schoollinx.com'"`
	SupportTitle         string    `json:"support_title" gorm:"type:varchar(255);default:'Technical Support Concierge'"`
	SupportDesc          string    `json:"support_desc" gorm:"type:text;default:'Assistance for headmasters, ICT coordinators & bursars.'"`
	GeneralEmail         string    `json:"general_email" gorm:"type:varchar(255);default:'info@schoollinx.com'"`
	DpoEmail             string    `json:"dpo_email" gorm:"type:varchar(255);default:'privacy@schoollinx.com'"`
	PrimaryPhone         string    `json:"primary_phone" gorm:"type:varchar(50);default:'+233 24 412 3456'"`
	PhoneTitle           string    `json:"phone_title" gorm:"type:varchar(255);default:'Direct Telephone & WhatsApp'"`
	OperatingHours       string    `json:"operating_hours" gorm:"type:varchar(255);default:'Monday to Friday, 8:00 AM – 5:00 PM GMT'"`
	WhatsAppNumber       string    `json:"whatsapp_number" gorm:"type:varchar(50);default:'+233244123456'"`
	EmergencyHotline     string    `json:"emergency_hotline" gorm:"type:varchar(50);default:'+233 20 000 1122'"`
	HeadquartersTitle    string    `json:"headquarters_title" gorm:"type:varchar(255);default:'Regional Headquarters'"`
	HeadquartersSubtitle string    `json:"headquarters_subtitle" gorm:"type:varchar(255);default:'West Africa Technology Innovation Hub'"`
	HeadquartersAddress  string    `json:"headquarters_address" gorm:"type:text;default:'Accra • Lagos • Nairobi'"`
	FullAddress          string    `json:"full_address" gorm:"type:text;default:'12 Independence Avenue, Ridge, Accra, Ghana'"`
	TwitterUrl           string    `json:"twitter_url" gorm:"type:varchar(255);default:'https://twitter.com'"`
	LinkedInUrl          string    `json:"linkedin_url" gorm:"type:varchar(255);default:'https://linkedin.com'"`
	GitHubUrl            string    `json:"github_url" gorm:"type:varchar(255);default:'https://github.com'"`
	YouTubeUrl           string    `json:"youtube_url" gorm:"type:varchar(255);default:'https://youtube.com'"`
	FacebookUrl          string    `json:"facebook_url" gorm:"type:varchar(255);default:'https://facebook.com'"`
	UpdatedAt            time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}
