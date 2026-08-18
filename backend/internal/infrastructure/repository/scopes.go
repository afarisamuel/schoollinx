package repository

import (
	"gorm.io/gorm"
)

// WithCampus was a generic GORM scope that automatically enforced multi-tenancy.
// It has been deprecated as the system has moved to a single-campus model.
func WithCampus(db *gorm.DB) *gorm.DB {
	return db
}
