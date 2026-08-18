package usecase

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type CBTUseCase struct {
	repo domain.CBTRepository
}

func NewCBTUseCase(repo domain.CBTRepository) *CBTUseCase {
	return &CBTUseCase{repo: repo}
}

func (u *CBTUseCase) CreateQuiz(ctx context.Context, quiz *domain.CBTQuiz) error {
	quiz.Status = domain.QuizStatusDraft
	return u.repo.CreateQuiz(ctx, quiz)
}

func (u *CBTUseCase) GetQuiz(ctx context.Context, id uuid.UUID) (*domain.CBTQuiz, error) {
	return u.repo.GetQuizByID(ctx, id)
}

func (u *CBTUseCase) ListClassQuizzes(ctx context.Context, classID uuid.UUID) ([]*domain.CBTQuiz, error) {
	return u.repo.ListQuizzesByClass(ctx, classID)
}

func (u *CBTUseCase) AddQuestion(ctx context.Context, question *domain.CBTQuestion) error {
	return u.repo.AddQuestion(ctx, question)
}

func (u *CBTUseCase) StartAttempt(ctx context.Context, attempt *domain.CBTAttempt) error {
	return u.repo.StartAttempt(ctx, attempt)
}

func (u *CBTUseCase) SubmitAnswer(ctx context.Context, answer *domain.CBTAnswer) error {
	// Auto-grade based on question type
	q, err := u.repo.GetQuestion(ctx, answer.QuestionID)
	if err == nil && q != nil {
		isCorrect := false
		if q.Type == domain.QuestionTypeMultipleChoice || q.Type == domain.QuestionTypeTrueFalse {
			isCorrect = strings.EqualFold(strings.TrimSpace(answer.AnswerData), strings.TrimSpace(q.CorrectAnswer))
		} else if q.Type == domain.QuestionTypeShortAnswer {
			// Keyword auto-scoring: correct answer contains comma-separated keywords
			keywords := strings.Split(q.CorrectAnswer, ",")
			answerText := strings.ToLower(answer.AnswerData)
			matches := 0
			for _, kw := range keywords {
				if strings.Contains(answerText, strings.ToLower(strings.TrimSpace(kw))) {
					matches++
				}
			}
			// If at least 50% of keywords match, consider it partially or fully correct
			if len(keywords) > 0 && matches >= (len(keywords)/2+len(keywords)%2) {
				isCorrect = true
			}
		}

		answer.IsCorrect = &isCorrect
		points := 0.0
		if isCorrect {
			points = q.Points
		}
		answer.PointsEarned = &points
	}

	return u.repo.SubmitAnswer(ctx, answer)
}

func (u *CBTUseCase) CompleteAttempt(ctx context.Context, attemptID uuid.UUID) error {
	return u.repo.CompleteAttempt(ctx, attemptID)
}
