package usecase

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type homeworkUseCase struct {
	repo domain.HomeworkRepository
}

func NewHomeworkUseCase(repo domain.HomeworkRepository) domain.HomeworkUseCase {
	return &homeworkUseCase{repo: repo}
}

func (u *homeworkUseCase) CreateHomework(ctx context.Context, homework *domain.Homework) error {
	return u.repo.Create(ctx, homework)
}

func (u *homeworkUseCase) GetHomeworkByID(ctx context.Context, id uuid.UUID) (*domain.Homework, error) {
	return u.repo.GetByID(ctx, id)
}

func (u *homeworkUseCase) GetHomeworksByClass(ctx context.Context, classID uuid.UUID) ([]domain.Homework, error) {
	return u.repo.GetByClass(ctx, classID)
}

func (u *homeworkUseCase) GetHomeworksByTeacher(ctx context.Context, teacherID uuid.UUID) ([]domain.Homework, error) {
	return u.repo.GetByTeacher(ctx, teacherID)
}

func (u *homeworkUseCase) UpdateHomework(ctx context.Context, homework *domain.Homework) error {
	return u.repo.Update(ctx, homework)
}

func (u *homeworkUseCase) DeleteHomework(ctx context.Context, id uuid.UUID) error {
	return u.repo.Delete(ctx, id)
}

func (u *homeworkUseCase) GetHomework(ctx context.Context, id uuid.UUID) (*domain.Homework, error) {
	return u.repo.GetByID(ctx, id)
}

func (u *homeworkUseCase) GetClassHomework(ctx context.Context, classID uuid.UUID) ([]domain.Homework, error) {
	return u.repo.GetByClass(ctx, classID)
}

func (u *homeworkUseCase) SubmitAssignment(ctx context.Context, submission *domain.HomeworkSubmission) error {
	return u.repo.SubmitHomework(ctx, submission)
}

func (u *homeworkUseCase) GradeAssignment(ctx context.Context, submissionID uuid.UUID, score float64, feedback string) error {
	return u.repo.GradeSubmission(ctx, submissionID, score, feedback)
}

func (u *homeworkUseCase) GetStudentSubmission(ctx context.Context, homeworkID, studentID uuid.UUID) (*domain.HomeworkSubmission, error) {
	return u.repo.GetSubmission(ctx, homeworkID, studentID)
}

func (u *homeworkUseCase) GetHomeworkSubmissions(ctx context.Context, homeworkID uuid.UUID) ([]domain.HomeworkSubmission, error) {
	return u.repo.GetSubmissionsForHomework(ctx, homeworkID)
}

func (u *homeworkUseCase) CheckSubmissionsSimilarity(ctx context.Context, homeworkID uuid.UUID) ([]domain.HomeworkSimilarityMatch, error) {
	submissions, err := u.repo.GetSubmissionsForHomework(ctx, homeworkID)
	if err != nil {
		return nil, err
	}

	var matches []domain.HomeworkSimilarityMatch
	n := len(submissions)

	// Compare pairs of submissions that have text content
	for i := 0; i < n; i++ {
		subA := submissions[i]
		wordsA := extractWordSet(subA.Content)
		if len(wordsA) < 5 {
			continue // Skip very short answers
		}

		for j := i + 1; j < n; j++ {
			subB := submissions[j]
			wordsB := extractWordSet(subB.Content)
			if len(wordsB) < 5 {
				continue
			}

			// Jaccard similarity = intersection / union
			intersection := 0
			for w := range wordsA {
				if wordsB[w] {
					intersection++
				}
			}

			union := len(wordsA)
			for w := range wordsB {
				if !wordsA[w] {
					union++
				}
			}

			if union == 0 {
				continue
			}

			similarity := float64(intersection) / float64(union)
			if similarity >= 0.30 { // Report noticeable overlaps
				matches = append(matches, domain.HomeworkSimilarityMatch{
					StudentAID:     subA.StudentID,
					StudentBID:     subB.StudentID,
					SimilarityRate: similarity,
					IsFlagged:      similarity >= 0.70,
				})
			}
		}
	}

	return matches, nil
}

func extractWordSet(text string) map[string]bool {
	set := make(map[string]bool)
	var current strings.Builder

	for _, ch := range strings.ToLower(text) {
		if (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') {
			current.WriteRune(ch)
		} else {
			if current.Len() > 2 { // Ignore 1-2 letter stop words
				set[current.String()] = true
			}
			current.Reset()
		}
	}
	if current.Len() > 2 {
		set[current.String()] = true
	}
	return set
}
