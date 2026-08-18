package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type cbtRepository struct {
	db *gorm.DB
}

func NewCBTRepository(db *gorm.DB) domain.CBTRepository {
	return &cbtRepository{db: db}
}

func (r *cbtRepository) CreateQuiz(ctx context.Context, quiz *domain.CBTQuiz) error {
	if quiz.ID == uuid.Nil {
		quiz.ID = uuid.New()
	}
	for i := range quiz.Questions {
		if quiz.Questions[i].ID == uuid.Nil {
			quiz.Questions[i].ID = uuid.New()
		}
		quiz.Questions[i].QuizID = quiz.ID
	}
	return r.db.WithContext(ctx).Create(quiz).Error
}

func (r *cbtRepository) GetQuizByID(ctx context.Context, id uuid.UUID) (*domain.CBTQuiz, error) {
	var quiz domain.CBTQuiz
	if err := r.db.WithContext(ctx).Preload("Questions").First(&quiz, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &quiz, nil
}

func (r *cbtRepository) ListQuizzesByClass(ctx context.Context, classID uuid.UUID) ([]*domain.CBTQuiz, error) {
	var quizzes []*domain.CBTQuiz
	if err := r.db.WithContext(ctx).Where("class_id = ?", classID).Order("created_at DESC").Find(&quizzes).Error; err != nil {
		return nil, err
	}
	return quizzes, nil
}

func (r *cbtRepository) AddQuestion(ctx context.Context, question *domain.CBTQuestion) error {
	if question.ID == uuid.Nil {
		question.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(question).Error
}

func (r *cbtRepository) StartAttempt(ctx context.Context, attempt *domain.CBTAttempt) error {
	if attempt.ID == uuid.Nil {
		attempt.ID = uuid.New()
	}
	attempt.StartedAt = time.Now()
	attempt.Status = domain.AttemptStatusInProgress
	return r.db.WithContext(ctx).Create(attempt).Error
}

func (r *cbtRepository) SubmitAnswer(ctx context.Context, answer *domain.CBTAnswer) error {
	if answer.ID == uuid.Nil {
		answer.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(answer).Error
}

func (r *cbtRepository) CompleteAttempt(ctx context.Context, attemptID uuid.UUID) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&domain.CBTAttempt{}).Where("id = ?", attemptID).
		Updates(map[string]interface{}{
			"status":       domain.AttemptStatusSubmitted,
			"completed_at": now,
		}).Error
}

func (r *cbtRepository) GetAttempt(ctx context.Context, attemptID uuid.UUID) (*domain.CBTAttempt, error) {
	var attempt domain.CBTAttempt
	if err := r.db.WithContext(ctx).Preload("Answers").First(&attempt, "id = ?", attemptID).Error; err != nil {
		return nil, err
	}
	return &attempt, nil
}

func (r *cbtRepository) GetQuestion(ctx context.Context, id uuid.UUID) (*domain.CBTQuestion, error) {
	var question domain.CBTQuestion
	if err := r.db.WithContext(ctx).First(&question, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &question, nil
}

func (r *cbtRepository) AddBankQuestion(ctx context.Context, q *domain.CBTQuestionBank) error {
	if q.ID == uuid.Nil {
		q.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(q).Error
}

func (r *cbtRepository) GetBankQuestionsBySubject(ctx context.Context, subjectID uuid.UUID, limit int) ([]domain.CBTQuestionBank, error) {
	var questions []domain.CBTQuestionBank
	query := r.db.WithContext(ctx).Where("subject_id = ?", subjectID)
	if limit > 0 {
		query = query.Limit(limit)
	}
	err := query.Find(&questions).Error
	return questions, err
}

func (r *cbtRepository) GetBankQuestionsByTopic(ctx context.Context, subjectID uuid.UUID, topic string) ([]domain.CBTQuestionBank, error) {
	var questions []domain.CBTQuestionBank
	err := r.db.WithContext(ctx).Where("subject_id = ? AND topic = ?", subjectID, topic).Find(&questions).Error
	return questions, err
}
