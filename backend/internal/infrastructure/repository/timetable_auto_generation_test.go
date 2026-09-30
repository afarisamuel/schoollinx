package repository_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/repository"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestAutoGenerateTimetable_OnlyAssignedClassSubjects(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to open in-memory sqlite: %v", err)
	}

	// Auto-migrate tables
	err = db.AutoMigrate(
		&domain.Class{},
		&domain.Subject{},
		&domain.Teacher{},
		&domain.TeacherClassAssignment{},
		&domain.TimetableEntry{},
		&domain.TeacherUnavailability{},
	)
	if err != nil {
		t.Fatalf("Failed to auto migrate: %v", err)
	}

	ctx := context.Background()

	// 1. Create 6 Total Platform Subjects
	math := domain.Subject{ID: uuid.New(), Name: "Core Mathematics", Code: "MTH"}
	phys := domain.Subject{ID: uuid.New(), Name: "Physics", Code: "PHY"}
	chem := domain.Subject{ID: uuid.New(), Name: "Chemistry", Code: "CHM"}
	french := domain.Subject{ID: uuid.New(), Name: "French", Code: "FRE"}
	arts := domain.Subject{ID: uuid.New(), Name: "Visual Arts", Code: "ART"}
	econ := domain.Subject{ID: uuid.New(), Name: "Economics", Code: "ECN"}

	for _, s := range []domain.Subject{math, phys, chem, french, arts, econ} {
		_ = db.Create(&s).Error
	}

	// 2. Create Teachers
	t1 := domain.Teacher{ID: uuid.New(), FirstName: "Kwame", LastName: "Teacher", Email: "kwame@example.com"}
	t2 := domain.Teacher{ID: uuid.New(), FirstName: "Ama", LastName: "Teacher", Email: "ama@example.com"}
	_ = db.Create(&t1).Error
	_ = db.Create(&t2).Error

	// 3. Create Science Class 1A (assigned ONLY Math, Physics, Chemistry)
	scienceClass := domain.Class{
		ID:       uuid.New(),
		Name:     "Science 1A",
		Subjects: []domain.Subject{math, phys, chem},
	}
	if err := db.Create(&scienceClass).Error; err != nil {
		t.Fatalf("Failed to create science class: %v", err)
	}

	// Assign Teacher t1 to Math for Science 1A
	mthID := math.ID
	assignment := domain.TeacherClassAssignment{
		ID:        uuid.New(),
		ClassID:   scienceClass.ID,
		TeacherID: t1.ID,
		SubjectID: &mthID,
	}
	_ = db.Create(&assignment).Error

	// 4. Run Timetable Auto-Generation for Science 1A
	repo := repository.NewTimetableRepository(db)
	entries, classCount, err := repo.AutoGenerateClassTimetable(ctx, &scienceClass.ID, true)
	if err != nil {
		t.Fatalf("AutoGenerateClassTimetable failed: %v", err)
	}

	if classCount != 1 {
		t.Fatalf("Expected class count 1, got %d", classCount)
	}
	if len(entries) == 0 {
		t.Fatalf("Expected timetable entries to be generated, got 0")
	}

	// 5. Verify: Every scheduled entry MUST be one of Math, Physics, or Chemistry!
	allowedSubjectIDs := map[uuid.UUID]bool{
		math.ID: true,
		phys.ID: true,
		chem.ID: true,
	}

	for _, e := range entries {
		if !allowedSubjectIDs[e.SubjectID] {
			t.Fatalf("Found UNASSIGNED subject (%s) scheduled on Science 1A timetable! Only Math, Physics, and Chemistry are assigned.", e.SubjectID)
		}
	}
}
