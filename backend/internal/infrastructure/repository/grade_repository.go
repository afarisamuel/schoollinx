package repository

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"math"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type gradeRepository struct {
	db *gorm.DB
}

func NewGradeRepository(db *gorm.DB) domain.GradeRepository {
	return &gradeRepository{db: db}
}

func (r *gradeRepository) Create(ctx context.Context, grade *domain.Grade) error {
	return r.db.WithContext(ctx).Create(grade).Error
}

func (r *gradeRepository) GetAll(ctx context.Context) ([]domain.Grade, error) {
	var grades []domain.Grade
	if err := r.db.WithContext(ctx).Find(&grades).Error; err != nil {
		return nil, err
	}
	return grades, nil
}

func (r *gradeRepository) GetByStudentID(ctx context.Context, studentID uuid.UUID) ([]domain.Grade, error) {
	var grades []domain.Grade
	if err := r.db.WithContext(ctx).Preload("Class").Where("student_id = ?", studentID).Find(&grades).Error; err != nil {
		return nil, err
	}
	return grades, nil
}

func (r *gradeRepository) GetByClassID(ctx context.Context, classID uuid.UUID) ([]domain.Grade, error) {
	var grades []domain.Grade
	if err := r.db.WithContext(ctx).Preload("Student").Where("class_id = ?", classID).Find(&grades).Error; err != nil {
		return nil, err
	}
	return grades, nil
}

func (r *gradeRepository) Update(ctx context.Context, grade *domain.Grade) error {
	return r.db.WithContext(ctx).Save(grade).Error
}

func (r *gradeRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.Grade{}, "id = ?", id).Error
}

// --- Phase 18: Grade Weight Methods ---

func (r *gradeRepository) GetWeightsByClassID(ctx context.Context, classID uuid.UUID) ([]domain.GradeWeight, error) {
	var weights []domain.GradeWeight
	if classID != uuid.Nil {
		err := r.db.WithContext(ctx).Where("class_id = ?", classID).Find(&weights).Error
		if err == nil && len(weights) > 0 {
			return weights, nil
		}
	}

	// Fallback to General / School-Wide Default weights (class_id IS NULL or class_id = '00000000-0000-0000-0000-000000000000')
	err := r.db.WithContext(ctx).Where("class_id IS NULL OR class_id = ?", uuid.Nil).Find(&weights).Error
	return weights, err
}

func (r *gradeRepository) GetGeneralWeights(ctx context.Context) ([]domain.GradeWeight, error) {
	var weights []domain.GradeWeight
	err := r.db.WithContext(ctx).Where("class_id IS NULL OR class_id = ?", uuid.Nil).Find(&weights).Error
	return weights, err
}

func (r *gradeRepository) UpsertWeight(ctx context.Context, w *domain.GradeWeight) error {
	if w.ClassID == nil || *w.ClassID == uuid.Nil {
		return r.db.WithContext(ctx).
			Where("(class_id IS NULL OR class_id = ?) AND category = ?", uuid.Nil, w.Category).
			Assign(domain.GradeWeight{Weight: w.Weight}).
			FirstOrCreate(w).Error
	}
	return r.db.WithContext(ctx).
		Where("class_id = ? AND category = ?", *w.ClassID, w.Category).
		Assign(domain.GradeWeight{Weight: w.Weight}).
		FirstOrCreate(w).Error
}

func (r *gradeRepository) ReplaceWeights(ctx context.Context, classID *uuid.UUID, weights []domain.GradeWeight) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if classID == nil || *classID == uuid.Nil {
			// Replacing General School Default weights
			if err := tx.Where("class_id IS NULL OR class_id = ?", uuid.Nil).Delete(&domain.GradeWeight{}).Error; err != nil {
				return err
			}
			for i := range weights {
				weights[i].ClassID = nil
				if err := tx.Create(&weights[i]).Error; err != nil {
					return err
				}
			}
		} else {
			// Replacing Class-Specific weights
			if err := tx.Where("class_id = ?", *classID).Delete(&domain.GradeWeight{}).Error; err != nil {
				return err
			}
			for i := range weights {
				weights[i].ClassID = classID
				if err := tx.Create(&weights[i]).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})
}

func (r *gradeRepository) DeleteWeightsByClassID(ctx context.Context, classID uuid.UUID) error {
	if classID == uuid.Nil {
		return r.db.WithContext(ctx).Where("class_id IS NULL OR class_id = ?", uuid.Nil).Delete(&domain.GradeWeight{}).Error
	}
	return r.db.WithContext(ctx).Where("class_id = ?", classID).Delete(&domain.GradeWeight{}).Error
}

// GetWeightedGPA computes a weighted GPA (0–100) per student in a class.
// For each student, it averages their scores per category, normalises to percentage,
// then multiplies by the configured weight for that category.
func (r *gradeRepository) GetWeightedGPA(ctx context.Context, classID uuid.UUID) ([]domain.GradeWeightedGPA, error) {
	weights, err := r.GetWeightsByClassID(ctx, classID)
	if err != nil {
		return nil, err
	}

	weightMap := make(map[domain.GradeCategory]float64)
	for _, w := range weights {
		// Normalize percentage weights (e.g. 30 -> 0.30)
		wt := float64(w.Weight)
		if wt > 1.0 {
			wt = wt / 100.0
		}
		weightMap[w.Category] = wt
	}

	grades, err := r.GetByClassID(ctx, classID)
	if err != nil {
		return nil, err
	}

	// Group grades per student per category
	type scoreSum struct {
		total, maxTotal float64
		count           int
	}
	type studentData struct {
		name       string
		categories map[domain.GradeCategory]*scoreSum
	}
	students := make(map[uuid.UUID]*studentData)

	for _, g := range grades {
		if _, ok := students[g.StudentID]; !ok {
			name := ""
			if g.Student != nil {
				name = string(g.Student.FirstName) + " " + string(g.Student.LastName)
			}
			students[g.StudentID] = &studentData{
				name:       name,
				categories: make(map[domain.GradeCategory]*scoreSum),
			}
		}
		cat := g.Category
		if _, ok := students[g.StudentID].categories[cat]; !ok {
			students[g.StudentID].categories[cat] = &scoreSum{}
		}
		maxScore := float64(g.MaxScore)
		if maxScore == 0 {
			maxScore = 100
		}
		students[g.StudentID].categories[cat].total += float64(g.Score)
		students[g.StudentID].categories[cat].maxTotal += maxScore
		students[g.StudentID].categories[cat].count++
	}

	var result []domain.GradeWeightedGPA
	for studentID, data := range students {
		var gpa float64
		for cat, ss := range data.categories {
			if ss.maxTotal == 0 {
				continue
			}
			pct := ss.total / ss.maxTotal * 100
			gpa += pct * weightMap[cat]
		}
		result = append(result, domain.GradeWeightedGPA{
			StudentID:   studentID,
			StudentName: data.name,
			GPA:         math.Round(gpa*100) / 100,
		})
	}
	return result, nil
}

// CurveGrades applies a curve transformation to all grades in a class for the given term.
func (r *gradeRepository) CurveGrades(ctx context.Context, classID uuid.UUID, term string, method string, factor float64) error {
	var grades []domain.Grade
	if err := r.db.WithContext(ctx).
		Where("class_id = ? AND term = ?", classID, term).
		Find(&grades).Error; err != nil {
		return err
	}

	for i := range grades {
		original := float64(grades[i].Score)
		maxScore := float64(grades[i].MaxScore)
		if maxScore == 0 {
			maxScore = 100
		}
		var curved float64
		switch method {
		case "SQRT":
			curved = math.Sqrt(original/maxScore) * maxScore
		case "LINEAR":
			curved = math.Min(original+factor, maxScore)
		default:
			return fmt.Errorf("unsupported curve method: %s", method)
		}
		grades[i].Score = float32(math.Round(curved*100) / 100)
		if err := r.db.WithContext(ctx).Save(&grades[i]).Error; err != nil {
			return err
		}
	}
	return nil
}

// --- Phase 18: Audit Log Methods ---

func (r *gradeRepository) LogChange(ctx context.Context, log *domain.GradeLog) error {
	log.ChangedAt = time.Now()
	return r.db.WithContext(ctx).Create(log).Error
}

func (r *gradeRepository) GetHistory(ctx context.Context, gradeID uuid.UUID) ([]domain.GradeLog, error) {
	var logs []domain.GradeLog
	err := r.db.WithContext(ctx).
		Preload("Editor").
		Where("grade_id = ?", gradeID).
		Order("changed_at DESC").
		Find(&logs).Error
	return logs, err
}

// --- Phase 18: Bulk CSV Import ---

// BulkCreate inserts or updates a batch of grades. Returns (imported count, error messages per row).
func (r *gradeRepository) BulkCreate(ctx context.Context, grades []domain.Grade) (int, []string, error) {
	var imported int
	var failures []string

	for i := range grades {
		g := &grades[i]

		// 1. If ID is provided, check if it exists and update
		if g.ID != uuid.Nil {
			var existing domain.Grade
			if err := r.db.WithContext(ctx).Where("id = ?", g.ID).First(&existing).Error; err == nil {
				existing.Score = g.Score
				existing.MaxScore = g.MaxScore
				existing.Remarks = g.Remarks
				existing.Category = g.Category
				existing.Subject = g.Subject
				existing.Term = g.Term
				existing.ClassID = g.ClassID
				if err := r.db.WithContext(ctx).Save(&existing).Error; err != nil {
					failures = append(failures, fmt.Sprintf("row %d (student %v): %v", i+1, g.StudentID, err))
				} else {
					imported++
				}
				continue
			}
		}

		// 2. Try to find existing grade by composite key (student, class, subject, term, category)
		var existing domain.Grade
		err := r.db.WithContext(ctx).
			Where("student_id = ? AND class_id = ? AND subject = ? AND term = ? AND category = ?",
				g.StudentID, g.ClassID, g.Subject, g.Term, g.Category).
			First(&existing).Error

		if err == nil {
			// Found existing entry: update score, remarks, etc.
			existing.Score = g.Score
			existing.MaxScore = g.MaxScore
			existing.Remarks = g.Remarks
			if err := r.db.WithContext(ctx).Save(&existing).Error; err != nil {
				failures = append(failures, fmt.Sprintf("row %d (student %v): %v", i+1, g.StudentID, err))
			} else {
				imported++
			}
		} else {
			// Not found: create new grade record
			if g.ID == uuid.Nil {
				g.ID = uuid.New()
			}
			if err := r.db.WithContext(ctx).Create(g).Error; err != nil {
				failures = append(failures, fmt.Sprintf("row %d (student %v): %v", i+1, g.StudentID, err))
			} else {
				imported++
			}
		}
	}

	return imported, failures, nil
}

// ParseCSVGrades parses a CSV reader into a slice of Grade structs.
// Expected columns: student_id, subject, category, score, max_score, term, remarks
func ParseCSVGrades(r io.Reader, classID uuid.UUID, editorID uuid.UUID) ([]domain.Grade, []string, error) {
	reader := csv.NewReader(r)
	header, err := reader.Read()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read CSV header: %w", err)
	}
	idx := make(map[string]int)
	for i, h := range header {
		idx[h] = i
	}

	required := []string{"student_id", "subject", "score", "term"}
	for _, col := range required {
		if _, ok := idx[col]; !ok {
			return nil, nil, fmt.Errorf("missing required column: %s", col)
		}
	}

	var grades []domain.Grade
	var warnings []string
	rowNum := 1
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			warnings = append(warnings, fmt.Sprintf("row %d: parse error %v", rowNum, err))
			rowNum++
			continue
		}
		studentID, err := uuid.Parse(record[idx["student_id"]])
		if err != nil {
			warnings = append(warnings, fmt.Sprintf("row %d: invalid student_id format", rowNum))
			rowNum++
			continue
		}
		score, err := strconv.ParseFloat(record[idx["score"]], 32)
		if err != nil {
			warnings = append(warnings, fmt.Sprintf("row %d: invalid score", rowNum))
			rowNum++
			continue
		}
		maxScore := float64(100)
		if v, ok := idx["max_score"]; ok && v < len(record) {
			if ms, e2 := strconv.ParseFloat(record[v], 32); e2 == nil {
				maxScore = ms
			}
		}
		cat := domain.CategoryAssignment
		if v, ok := idx["category"]; ok && v < len(record) {
			cat = domain.GradeCategory(record[v])
		}
		remarks := ""
		if v, ok := idx["remarks"]; ok && v < len(record) {
			remarks = record[v]
		}
		grades = append(grades, domain.Grade{
			ClassID:   classID,
			StudentID: studentID,
			Subject:   record[idx["subject"]],
			Score:     float32(score),
			MaxScore:  float32(maxScore),
			Category:  cat,
			Term:      record[idx["term"]],
			Remarks:   remarks,
			EditorID:  editorID,
		})
		rowNum++
	}
	return grades, warnings, nil
}

func (r *gradeRepository) GetGradeDistribution(ctx context.Context) (map[string]int, error) {
	distribution := map[string]int{"A": 0, "B": 0, "C": 0, "D": 0, "F": 0}
	
	// Fast SQL aggregation using CASE statements for letter grade brackets
	var results []struct {
		GradeBracket string
		Count        int
	}
	
	if err := r.db.WithContext(ctx).Model(&domain.Grade{}).
		Select(`
			CASE 
				WHEN (score / NULLIF(max_score, 0)) * 100 >= 90 THEN 'A'
				WHEN (score / NULLIF(max_score, 0)) * 100 >= 80 THEN 'B'
				WHEN (score / NULLIF(max_score, 0)) * 100 >= 70 THEN 'C'
				WHEN (score / NULLIF(max_score, 0)) * 100 >= 60 THEN 'D'
				ELSE 'F'
			END as grade_bracket,
			COUNT(*) as count
		`).
		Group("grade_bracket").
		Scan(&results).Error; err != nil {
		return distribution, err
	}
	
	for _, res := range results {
		if _, ok := distribution[res.GradeBracket]; ok {
			distribution[res.GradeBracket] = res.Count
		}
	}
	
	return distribution, nil
}

func (r *gradeRepository) GetStudentGradeAverages(ctx context.Context) ([]domain.StudentGradeAverage, error) {
	var results []domain.StudentGradeAverage
	
	err := r.db.WithContext(ctx).Model(&domain.Grade{}).
		Select("student_id, AVG((score / NULLIF(max_score, 0)) * 100) as average").
		Group("student_id").
		Scan(&results).Error
	return results, err
}

func (r *gradeRepository) GetStudentGradeTrajectory(ctx context.Context, studentID uuid.UUID) ([]domain.GradeTrajectoryPoint, error) {
	var results []domain.GradeTrajectoryPoint
	
	err := r.db.WithContext(ctx).Model(&domain.Grade{}).
		Select("subject, created_at as date, (score / NULLIF(max_score, 0)) * 100 as score").
		Where("student_id = ?", studentID).
		Order("created_at ASC").
		Scan(&results).Error
	return results, err
}
