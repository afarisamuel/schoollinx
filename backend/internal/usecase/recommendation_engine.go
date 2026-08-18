package usecase

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type recommendationEngine struct {
	recRepo     domain.RecommendationRepository
	gradeRepo   domain.GradeRepository
	subjectRepo domain.SubjectRepository
	studentRepo domain.StudentRepository
}

func NewRecommendationEngine(
	rr domain.RecommendationRepository,
	gr domain.GradeRepository,
	sr domain.SubjectRepository,
	str domain.StudentRepository,
) domain.RecommendationEngine {
	return &recommendationEngine{
		recRepo:     rr,
		gradeRepo:   gr,
		subjectRepo: sr,
		studentRepo: str,
	}
}

func (e *recommendationEngine) GenerateInsights(ctx context.Context, studentID uuid.UUID) error {
	// 1. Fetch historical grades
	grades, err := e.gradeRepo.GetByStudentID(ctx, studentID)
	if err != nil {
		return fmt.Errorf("failed to fetch grades: %w", err)
	}

	// Calculate baseline averages per subject name (since Grade stores Subject as a string)
	subjectScores := make(map[string][]float32)
	for _, g := range grades {
		subjectScores[g.Subject] = append(subjectScores[g.Subject], g.Score)
	}

	subjectAverages := make(map[string]float32)
	var totalScore float32
	var totalGrades int
	for sub, scores := range subjectScores {
		var sum float32
		for _, s := range scores {
			sum += s
			totalScore += s
			totalGrades++
		}
		subjectAverages[sub] = sum / float32(len(scores))
	}

	overallGPA := float32(0)
	if totalGrades > 0 {
		overallGPA = totalScore / float32(totalGrades)
	}

	// 2. Fetch all available subjects
	allSubjects, err := e.subjectRepo.GetAll(ctx)
	if err != nil {
		return fmt.Errorf("failed to fetch subjects: %w", err)
	}

	var recommendations []domain.SubjectRecommendation

	// 3. Apply Heuristics
	for _, sub := range allSubjects {
		// Skip if they've already taken it (basic heuristic: if it's in their grade history)
		hasTaken := false
		for takenSub := range subjectAverages {
			if strings.EqualFold(takenSub, sub.Name) {
				hasTaken = true
				break
			}
		}
		if hasTaken {
			continue
		}

		// HEURISTIC 1: Enrichment (Remedial/Support)
		// If overall GPA is struggling (< 70), suggest foundational or support subjects.
		if overallGPA < 70 && overallGPA > 0 {
			if strings.Contains(strings.ToLower(sub.Name), "foundations") || strings.Contains(strings.ToLower(sub.Name), "support") {
				recommendations = append(recommendations, domain.SubjectRecommendation{
					StudentID:       studentID,
					SubjectID:       sub.ID,
					ConfidenceScore: 0.95,
					Rationale:       fmt.Sprintf("Recommended enrichment: Your historical average (%.1f%%) indicates foundational support would be highly beneficial.", overallGPA),
					IsEnrichment:    true,
				})
				continue // Skip other heuristics for this subject
			}
		}

		// HEURISTIC 2: Advanced Placement (High Performance)
		// If they have high marks in a related field, recommend advanced courses.
		if strings.Contains(strings.ToLower(sub.Name), "advanced") || strings.Contains(strings.ToLower(sub.Name), "ap ") {
			// Find a 'base' subject they might have taken (e.g., "Math" for "Advanced Math")
			baseSubject := strings.Replace(strings.ToLower(sub.Name), "advanced ", "", 1)
			baseSubject = strings.Replace(baseSubject, "ap ", "", 1)

			for takenSub, avg := range subjectAverages {
				if strings.Contains(strings.ToLower(takenSub), baseSubject) && avg >= 85 {
					recommendations = append(recommendations, domain.SubjectRecommendation{
						StudentID:       studentID,
						SubjectID:       sub.ID,
						ConfidenceScore: 0.88,
						Rationale:       fmt.Sprintf("Recommended advancement: You demonstrated excellence (%.1f%%) in related foundational courses like %s.", avg, takenSub),
						IsEnrichment:    false,
					})
					break // Found a correlation
				}
			}
			continue
		}

		// HEURISTIC 3: General Interest & Trajectory
		// Recommend standard subjects based on general strong performance > 75
		if overallGPA >= 75 && !strings.Contains(strings.ToLower(sub.Name), "foundations") {
			recommendations = append(recommendations, domain.SubjectRecommendation{
				StudentID:       studentID,
				SubjectID:       sub.ID,
				ConfidenceScore: 0.70,
				Rationale:       "Recommended based on your solid overall academic trajectory and capacity for new disciplines.",
				IsEnrichment:    false,
			})
		}
	}

	// 4. Persist to DB
	return e.recRepo.SaveRecommendations(ctx, studentID, recommendations)
}

func (e *recommendationEngine) GenerateAllInsights(ctx context.Context) error {
	// For background workers: fetch all active students and generate
	students, err := e.studentRepo.GetAll(ctx)
	if err != nil {
		return err
	}

	for _, s := range students {
		// Ignore errors for individual students to keep the batch running
		_ = e.GenerateInsights(ctx, s.ID)
	}

	return nil
}

func (e *recommendationEngine) GetLearningPath(ctx context.Context, studentID uuid.UUID) (*domain.LearningPath, error) {
	recs, err := e.recRepo.GetStudentRecommendations(ctx, studentID)
	if err != nil {
		return nil, err
	}

	student, err := e.studentRepo.GetByID(ctx, studentID)
	studentName := "Unknown Student"
	if err == nil && student != nil {
		studentName = fmt.Sprintf("%s %s", student.FirstName, student.LastName)
	}

	// Hydrate subject names for the frontend
	allSubjects, _ := e.subjectRepo.GetAll(ctx)
	subjectMap := make(map[uuid.UUID]domain.Subject)
	for _, s := range allSubjects {
		subjectMap[s.ID] = s
	}

	for i, r := range recs {
		if sub, ok := subjectMap[r.SubjectID]; ok {
			recs[i].SubjectName = sub.Name
		} else {
			recs[i].SubjectName = "Unknown Subject"
		}
	}

	return &domain.LearningPath{
		StudentID:       studentID,
		StudentName:     studentName,
		Recommendations: recs,
		GeneratedAt:     time.Now(),
	}, nil
}
