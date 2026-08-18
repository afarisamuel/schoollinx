package usecase

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type searchUseCase struct {
	studentRepo domain.StudentRepository
	teacherRepo domain.TeacherRepository
}

func NewSearchUseCase(sr domain.StudentRepository, tr domain.TeacherRepository) domain.SearchUseCase {
	return &searchUseCase{
		studentRepo: sr,
		teacherRepo: tr,
	}
}

func (u *searchUseCase) Search(ctx context.Context, query string) ([]domain.SearchResult, error) {
	var results []domain.SearchResult
	query = strings.ToLower(query)

	// Search Students
	students, err := u.studentRepo.GetAll(ctx)
	if err == nil {
		for _, s := range students {
			fullName := strings.ToLower(fmt.Sprintf("%s %s", string(s.FirstName), string(s.LastName)))
			if strings.Contains(fullName, query) {
				results = append(results, domain.SearchResult{
					Type:  "student",
					ID:    s.ID,
					Title: fmt.Sprintf("%s %s", string(s.FirstName), string(s.LastName)),
					Path:  fmt.Sprintf("/students/%s", s.ID.String()),
				})
			}
		}
	}

	// Search Teachers
	teachers, err := u.teacherRepo.GetAll(ctx)
	if err == nil {
		for _, t := range teachers {
			fullName := strings.ToLower(fmt.Sprintf("%s %s", string(t.FirstName), string(t.LastName)))
			if strings.Contains(fullName, query) || strings.Contains(strings.ToLower(string(t.Email)), query) {
				results = append(results, domain.SearchResult{
					Type:  "teacher",
					ID:    t.ID,
					Title: fmt.Sprintf("%s %s", string(t.FirstName), string(t.LastName)),
					Path:  fmt.Sprintf("/teachers/%s", t.ID.String()),
				})
			}
		}
	}

	// Dynamic Page Navigation Result (System Features)
	pages := []struct {
		Title string
		Path  string
		Tags  string
	}{
		{"Dashboard", "/dashboard", "stats home overview"},
		{"Students Directory", "/students", "list pupils registry"},
		{"Attendance Marking", "/attendance", "roll call presence"},
		{"Timetable Management", "/timetable", "schedule classes calendar"},
		{"Scholastic Analytics", "/analytics", "charts performance data"},
	}

	for _, p := range pages {
		if strings.Contains(strings.ToLower(p.Title), query) || strings.Contains(strings.ToLower(p.Tags), query) {
			results = append(results, domain.SearchResult{
				Type:  "page",
				ID:    uuid.Nil,
				Title: p.Title,
				Path:  p.Path,
			})
		}
	}

	// Limit results
	if len(results) > 10 {
		results = results[:10]
	}

	return results, nil
}
