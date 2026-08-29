package usecase

import (
	"context"
	"errors"
	"math/rand"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type cbtQuestionBankUseCase struct {
	repo domain.CBTRepository
}

func NewCBTQuestionBankUseCase(repo domain.CBTRepository) domain.CBTQuestionBankUseCase {
	return &cbtQuestionBankUseCase{repo: repo}
}

func (u *cbtQuestionBankUseCase) AddQuestion(ctx context.Context, q *domain.CBTQuestionBank) error {
	if q.Content == "" || q.CorrectAnswer == "" {
		return errors.New("question content and correct answer are required")
	}
	return u.repo.AddBankQuestion(ctx, q)
}

func (u *cbtQuestionBankUseCase) GetQuestionsForSubject(ctx context.Context, subjectID uuid.UUID) ([]domain.CBTQuestionBank, error) {
	return u.repo.GetBankQuestionsBySubject(ctx, subjectID, 0)
}

func (u *cbtQuestionBankUseCase) GenerateQuizFromBank(ctx context.Context, quizID uuid.UUID, subjectID uuid.UUID, count int, criteria map[string]interface{}) error {
	if count <= 0 {
		count = 10 // Default to 10 questions
	}

	var questions []domain.CBTQuestionBank
	var err error

	// If topic criterion is specified, filter by topic
	if topic, ok := criteria["topic"].(string); ok && topic != "" {
		questions, err = u.repo.GetBankQuestionsByTopic(ctx, subjectID, topic)
	} else {
		questions, err = u.repo.GetBankQuestionsBySubject(ctx, subjectID, 0)
	}

	if err != nil {
		return err
	}

	if len(questions) == 0 {
		return errors.New("no questions found in bank matching criteria")
	}

	// Shuffle questions using pseudo-random generator
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	r.Shuffle(len(questions), func(i, j int) {
		questions[i], questions[j] = questions[j], questions[i]
	})

	// Select up to `count` questions
	selectedCount := count
	if selectedCount > len(questions) {
		selectedCount = len(questions)
	}

	for i := 0; i < selectedCount; i++ {
		bankQ := questions[i]
		q := domain.CBTQuestion{
			ID:            uuid.New(),
			QuizID:        quizID,
			Type:          bankQ.Type,
			Content:       bankQ.Content,
			Options:       bankQ.Options,
			CorrectAnswer: bankQ.CorrectAnswer,
			Points:        1.0,
			Order:         i + 1,
		}

		if err := u.repo.AddQuestion(ctx, &q); err != nil {
			return err
		}
	}

	return nil
}
