package domain

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/pkg/encryption"
	"golang.org/x/text/cases"
	"golang.org/x/text/language"
	"gorm.io/gorm"
)

// CapitalizeName converts a string to Proper/Title Case, handling multi-word and hyphenated names.
// Examples: "john doe" -> "John Doe", "MARY-JANE" -> "Mary-Jane", " kwame   mensah " -> "Kwame Mensah"
func CapitalizeName(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return ""
	}
	words := strings.Fields(name)
	caser := cases.Title(language.English)
	for i, w := range words {
		if strings.Contains(w, "-") {
			parts := strings.Split(w, "-")
			for j, p := range parts {
				if p != "" {
					parts[j] = caser.String(strings.ToLower(p))
				}
			}
			words[i] = strings.Join(parts, "-")
		} else {
			words[i] = caser.String(strings.ToLower(w))
		}
	}
	return strings.Join(words, " ")
}

// CapitalizeNames capitalizes all student and guardian name fields.
func (s *Student) CapitalizeNames() {
	if s == nil {
		return
	}
	if s.FirstName != "" {
		s.FirstName = encryption.EncryptedString(CapitalizeName(string(s.FirstName)))
	}
	if s.LastName != "" {
		s.LastName = encryption.EncryptedString(CapitalizeName(string(s.LastName)))
	}
	if s.OtherName != "" {
		s.OtherName = encryption.EncryptedString(CapitalizeName(string(s.OtherName)))
	}
	if s.FatherName != "" {
		s.FatherName = encryption.EncryptedString(CapitalizeName(string(s.FatherName)))
	}
	if s.MotherName != "" {
		s.MotherName = encryption.EncryptedString(CapitalizeName(string(s.MotherName)))
	}
	if s.GuardianName != "" {
		s.GuardianName = encryption.EncryptedString(CapitalizeName(string(s.GuardianName)))
	}
	if s.EmergencyContactName != "" {
		s.EmergencyContactName = encryption.EncryptedString(CapitalizeName(string(s.EmergencyContactName)))
	}
	for _, g := range s.Guardians {
		if g != nil {
			if g.FirstName != "" {
				g.FirstName = encryption.EncryptedString(CapitalizeName(string(g.FirstName)))
			}
			if g.LastName != "" {
				g.LastName = encryption.EncryptedString(CapitalizeName(string(g.LastName)))
			}
		}
	}
}

type StudentStatus string

const (
	StatusActive    StudentStatus = "ACTIVE"
	StatusAlumni    StudentStatus = "ALUMNI"
	StatusWithdrawn StudentStatus = "WITHDRAWN"
)

type Student struct {
	Guardians []*Guardian `json:"guardians,omitempty" gorm:"many2many:student_guardians;"`
	CreatedAt time.Time   `json:"created_at"`
	UpdatedAt time.Time   `json:"updated_at"`
	Gender    string      `json:"gender"`
	// --- Placement Details ---
	PlacedResidenceType string `json:"placed_residence_type"`
	PhotoURL            string `json:"photo_url"`
	// --- System Fields ---
	EnrollmentNum string `json:"enrollment_num" gorm:"unique"`
	AcademicYear  string `json:"academic_year" gorm:"type:varchar(20)"`
	RFIDToken     string `json:"rfid_token" gorm:"column:rfid_token;index"`
	// --- Core Identity ---
	FirstName      encryption.EncryptedString `json:"first_name" gorm:"not null"`
	LastName       encryption.EncryptedString `json:"last_name" gorm:"not null"`
	OtherName      encryption.EncryptedString `json:"other_name"`
	DOB            encryption.EncryptedString `json:"dob"`
	PhoneNumber    encryption.EncryptedString `json:"phone_number"`
	Address        encryption.EncryptedString `json:"address"`
	// --- Family & Health ---
	FatherName           encryption.EncryptedString `json:"father_name"`
	FatherPhone          encryption.EncryptedString `json:"father_phone"`
	FatherEmail          encryption.EncryptedString `json:"father_email"`
	FatherOccupation     encryption.EncryptedString `json:"father_occupation"`
	MotherName           encryption.EncryptedString `json:"mother_name"`
	MotherPhone          encryption.EncryptedString `json:"mother_phone"`
	MotherEmail          encryption.EncryptedString `json:"mother_email"`
	MotherOccupation     encryption.EncryptedString `json:"mother_occupation"`
	GuardianName         encryption.EncryptedString `json:"guardian_name"`
	GuardianPhone        encryption.EncryptedString `json:"guardian_phone"`
	GuardianEmail        encryption.EncryptedString `json:"guardian_email"`
	GuardianRelation     encryption.EncryptedString `json:"guardian_relation"`
	EmergencyContactName encryption.EncryptedString `json:"emergency_contact_name"`
	EmergencyContactPhone encryption.EncryptedString `json:"emergency_contact_phone"`
	HealthConditions     encryption.EncryptedString `json:"health_conditions"`
	Allergies            encryption.EncryptedString `json:"allergies"`
	BloodGroup           string                     `json:"blood_group"`
	ClassID        *uuid.UUID                 `json:"class_id" gorm:"type:uuid"`
	Class          *Class                     `json:"class,omitempty" gorm:"foreignKey:ClassID"`
	Status         StudentStatus              `json:"status" gorm:"default:ACTIVE"`
	GraduationDate *time.Time                 `json:"graduation_date,omitempty"`
	UserID         *uuid.UUID                 `json:"user_id" gorm:"type:uuid"`
	User           *User                      `json:"user,omitempty" gorm:"foreignKey:UserID"`
	AlumniProfile  *AlumniProfile             `json:"alumni_profile,omitempty" gorm:"foreignKey:StudentID"`
	Level          int                        `json:"level" gorm:"default:1"`
	PrepaidBalance float64                    `json:"prepaid_balance" gorm:"default:0"`
	ID             uuid.UUID                  `json:"id" gorm:"type:uuid;primaryKey"`
	TenantBase
}

func (s *Student) BeforeCreate(tx *gorm.DB) (err error) {
	s.CapitalizeNames()
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	if s.EnrollmentNum == "" {
		year := time.Now().Year()
		s.EnrollmentNum = fmt.Sprintf("STU-%d-%s", year, strings.ToUpper(s.ID.String()[:6]))
	}
	return
}

func (s *Student) BeforeUpdate(tx *gorm.DB) (err error) {
	s.CapitalizeNames()
	return
}

type AlumniProfile struct {
	UpdatedAt              time.Time `json:"updated_at"`
	HigherEd               string    `json:"higher_ed"`
	CurrentCareer          string    `json:"current_career"`
	LinkedInURL            string    `json:"linkedin_url"`
	AvailableForMentorship bool      `json:"available_for_mentorship" gorm:"default:false"`
	MentorshipField        string    `json:"mentorship_field"`
	EndowmentPledged       float64   `json:"endowment_pledged" gorm:"default:0"`
	ID                     uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	StudentID              uuid.UUID `json:"student_id" gorm:"type:uuid;unique;not null"`
	TenantBase
}

func (ap *AlumniProfile) BeforeCreate(tx *gorm.DB) (err error) {
	if ap.ID == uuid.Nil {
		ap.ID = uuid.New()
	}
	return
}

type TimelineEvent struct {
	Date        time.Time              `json:"date"`
	Type        string                 `json:"type"` // e.g., "grade", "attendance", "welfare", "extracurricular"
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	ID          uuid.UUID              `json:"id"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"` // For extra details like score, risk level, etc.
}

