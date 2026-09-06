package handler

import (
	"fmt"
	"math"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/pdf"
)

// TeacherPortalHandler provides self-service endpoints for authenticated Teachers.
type TeacherPortalHandler struct {
	portalUseCase domain.TeacherPortalUseCase
	evalRepo      domain.TerminalEvaluationRepository
	tenantRepo    domain.TenantRepository
	academicRepo  domain.AcademicPeriodRepository
	subjectRepo   domain.SubjectRepository
	teacherRepo   domain.TeacherRepository
	classRepo     domain.ClassRepository
	gradeRepo     domain.GradeRepository
}

func NewTeacherPortalHandler(
	rg *gin.RouterGroup,
	portalUseCase domain.TeacherPortalUseCase,
	evalRepo domain.TerminalEvaluationRepository,
	tenantRepo domain.TenantRepository,
	academicRepo domain.AcademicPeriodRepository,
	subjectRepo domain.SubjectRepository,
	teacherRepo domain.TeacherRepository,
	classRepo domain.ClassRepository,
	gradeRepo domain.GradeRepository,
) {
	h := &TeacherPortalHandler{
		portalUseCase: portalUseCase,
		evalRepo:      evalRepo,
		tenantRepo:    tenantRepo,
		academicRepo:  academicRepo,
		subjectRepo:   subjectRepo,
		teacherRepo:   teacherRepo,
		classRepo:     classRepo,
		gradeRepo:     gradeRepo,
	}

	portal := rg.Group("/teacher-portal")
	portal.GET("/my-classes", h.GetMyClasses)
	portal.GET("/my-classes/:class_id/students", h.GetClassStudents)
	portal.POST("/my-classes/:class_id/grades", h.BulkSubmitGrades)
	portal.GET("/my-classes/:class_id/grades", h.GetClassGrades)

	// Phase 18 Features
	portal.GET("/my-classes/:class_id/weights", h.GetClassWeights)
	portal.PUT("/my-classes/:class_id/weights", h.UpdateClassWeights)
	portal.GET("/my-classes/:class_id/gpa", h.GetClassGPA)
	portal.POST("/my-classes/:class_id/curve", h.CurveGrades)
	portal.GET("/grades/:grade_id/history", h.GetGradeHistory)
	portal.POST("/my-classes/:class_id/grades/import", h.ImportGradesCSV)
	portal.GET("/my-classes/:class_id/grades/export", h.ExportGradesPDF)
	
	// Evaluations
	portal.GET("/my-classes/:class_id/students/:student_id/evaluations", h.GetStudentEvaluation)
	portal.PUT("/my-classes/:class_id/students/:student_id/evaluations", h.UpdateStudentEvaluation)

	// Classroom Mastery Suite (Phase 1-3)
	portal.GET("/my-classes/:class_id/seating", h.GetSeatingChart)
	portal.POST("/my-classes/:class_id/seating", h.SaveSeatingChart)
	portal.GET("/my-classes/:class_id/lesson-plans", h.GetLessonPlans)
	portal.POST("/my-classes/:class_id/lesson-plans", h.CreateLessonPlan)
	portal.PUT("/lesson-plans/:id", h.UpdateLessonPlan)
	portal.GET("/rubrics", h.GetRubrics)
	portal.POST("/rubrics", h.CreateRubric)
	portal.POST("/sickbay-referrals", h.CreateSickbayReferral)
	portal.GET("/my-classes/:class_id/sickbay-referrals", h.GetClassReferrals)
	portal.GET("/my-classes/:class_id/resources", h.GetClassResources)
	portal.POST("/my-classes/:class_id/resources", h.CreateResource)

	// Teacher Substitution / Cover Requests (Feature 37)
	portal.GET("/cover-requests", h.GetCoverRequests)
	portal.POST("/cover-requests", h.CreateCoverRequest)
	portal.PUT("/cover-requests/:id/claim", h.ClaimCoverRequest)
}

// GetMyClasses returns all classes the currently logged-in teacher is assigned to teach.
func (h *TeacherPortalHandler) GetMyClasses(c *gin.Context) {
	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}
	userID := val.(uuid.UUID)

	teacher, assignments, err := h.portalUseCase.GetMyClasses(c.Request.Context(), userID)
	if err != nil {
		if err.Error() == "record not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "teacher profile not found for this user"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"teacher":     teacher,
		"assignments": assignments,
	})
}

// GetClassStudents returns all enrolled students for a specific class.
func (h *TeacherPortalHandler) GetClassStudents(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID format"})
		return
	}
	students, err := h.portalUseCase.GetClassStudents(c.Request.Context(), classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, students)
}

// GetClassGrades returns all grades recorded for a specific class.
func (h *TeacherPortalHandler) GetClassGrades(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID format"})
		return
	}
	grades, err := h.portalUseCase.GetClassGrades(c.Request.Context(), classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, grades)
}

// GetClassWeights returns configured weight thresholds for a given class.
func (h *TeacherPortalHandler) GetClassWeights(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID format"})
		return
	}
	weights, err := h.portalUseCase.GetClassWeights(c.Request.Context(), classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, weights)
}

// UpdateClassWeights bulk upserts category weights for a class.
func (h *TeacherPortalHandler) UpdateClassWeights(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID format"})
		return
	}
	var weights []domain.GradeWeight
	if err := c.ShouldBindJSON(&weights); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.portalUseCase.UpdateClassWeights(c.Request.Context(), classID, weights); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update weights"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "weights successfully updated"})
}

// GetClassGPA retrieves auto-calculated weighted GPA averages across all class students.
func (h *TeacherPortalHandler) GetClassGPA(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID format"})
		return
	}
	gpaList, err := h.portalUseCase.GetClassGPA(c.Request.Context(), classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gpaList)
}

// CurveGrades exposes the curve/scale methodology tool for normalizing challenging scores.
func (h *TeacherPortalHandler) CurveGrades(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID format"})
		return
	}
	var req struct {
		Term   string  `json:"term" binding:"required"`
		Method string  `json:"method" binding:"required"`
		Factor float64 `json:"factor"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.portalUseCase.CurveGrades(c.Request.Context(), classID, req.Term, req.Method, req.Factor); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "grades curved successfully"})
}

// GetGradeHistory returns the chronological tracking events for an individual score.
func (h *TeacherPortalHandler) GetGradeHistory(c *gin.Context) {
	gradeID, err := uuid.Parse(c.Param("grade_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid grade ID format"})
		return
	}
	history, err := h.portalUseCase.GetGradeHistory(c.Request.Context(), gradeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, history)
}

// BulkSubmitGrades accepts an array of grade entries for batch insertion/upsertion.
func (h *TeacherPortalHandler) BulkSubmitGrades(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID format"})
		return
	}

	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}
	editorID := val.(uuid.UUID)

	var entries []domain.Grade
	if err := c.ShouldBindJSON(&entries); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	saved, err := h.portalUseCase.BulkSubmitGrades(c.Request.Context(), classID, editorID, entries)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "grades saved successfully",
		"count":   len(saved),
		"grades":  saved,
	})
}

// ImportGradesCSV enables bulk ingestion from a teacher-provided CSV file.
func (h *TeacherPortalHandler) ImportGradesCSV(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID format"})
		return
	}

	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}
	editorID := val.(uuid.UUID)

	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read file: " + err.Error()})
		return
	}
	defer file.Close()

	imported, failures, warnings, err := h.portalUseCase.ImportGrades(c.Request.Context(), classID, editorID, file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "CSV import completed",
		"imported": imported,
		"failures": failures,
		"warnings": warnings,
	})
}

// ExportGradesPDF creates a downloadable, high-density landscape PDF of the live Speed Gradebook matrix.
func (h *TeacherPortalHandler) ExportGradesPDF(c *gin.Context) {
	ctx := c.Request.Context()
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID format"})
		return
	}

	term := strings.TrimSpace(c.Query("term"))
	subjectQuery := strings.TrimSpace(c.Query("subject"))
	subjectIDQuery := strings.TrimSpace(c.Query("subject_id"))
	periodIDQuery := strings.TrimSpace(c.Query("period_id"))

	// 1. Fetch Class
	var class *domain.Class
	if h.classRepo != nil {
		class, _ = h.classRepo.GetByID(ctx, classID)
	}

	// 2. Fetch Students
	students, err := h.portalUseCase.GetClassStudents(ctx, classID)
	if err != nil || len(students) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "no enrolled scholars found in this class"})
		return
	}

	// 3. Fetch Tenant & Branding
	var tenant *domain.Tenant
	if h.tenantRepo != nil {
		if val, exists := ctx.Value(middleware.TenantIDKey).(uuid.UUID); exists && val != uuid.Nil {
			tenant, _ = h.tenantRepo.GetByID(ctx, val)
		}
	}

	// 4. Resolve Academic Year & Term
	academicYear := ""
	if h.academicRepo != nil {
		if periodIDQuery != "" {
			if pID, err := uuid.Parse(periodIDQuery); err == nil {
				if p, err := h.academicRepo.GetByID(ctx, pID); err == nil && p != nil {
					academicYear = p.Name
				}
			}
		}
		if academicYear == "" {
			if activeP, err := h.academicRepo.GetActive(ctx); err == nil && activeP != nil {
				academicYear = activeP.Name
				if term == "" && len(activeP.Terms) > 0 {
					term = activeP.Terms[0].Name
				}
			}
		}
	}
	if term == "" {
		term = "Semester 1"
	}
	if academicYear == "" {
		academicYear = fmt.Sprintf("%d/%d", time.Now().Year(), time.Now().Year()+1)
	}

	// 5. Resolve Teacher Name
	teacherName := "Unassigned Form Master"
	if h.teacherRepo != nil {
		if val, exists := c.Get("userID"); exists {
			if uID, ok := val.(uuid.UUID); ok && uID != uuid.Nil {
				if t, err := h.teacherRepo.GetByUserID(ctx, uID); err == nil && t != nil {
					teacherName = fmt.Sprintf("%s %s", string(t.FirstName), string(t.LastName))
				}
			}
		}
	}
	if teacherName == "Unassigned Form Master" && class != nil {
		if class.Teacher != nil {
			teacherName = fmt.Sprintf("%s %s", string(class.Teacher.FirstName), string(class.Teacher.LastName))
		} else if class.TeacherID != nil && h.teacherRepo != nil {
			if t, err := h.teacherRepo.GetByID(ctx, *class.TeacherID); err == nil && t != nil {
				teacherName = fmt.Sprintf("%s %s", string(t.FirstName), string(t.LastName))
			}
		}
	}

	// 6. Resolve Subject
	resolvedSubject := subjectQuery
	resolvedSubjectCode := ""
	if resolvedSubject == "" && subjectIDQuery != "" && h.subjectRepo != nil {
		if sID, err := uuid.Parse(subjectIDQuery); err == nil {
			if s, err := h.subjectRepo.GetByID(ctx, sID); err == nil && s != nil {
				resolvedSubject = s.Name
				resolvedSubjectCode = s.Code
			}
		}
	}
	if resolvedSubject == "" && class != nil && len(class.Subjects) > 0 {
		resolvedSubject = class.Subjects[0].Name
		resolvedSubjectCode = class.Subjects[0].Code
	}
	if resolvedSubject == "" {
		resolvedSubject = "All Core Subjects"
	}

	// 7. Resolve Assessment Columns & Weights
	weights, _ := h.portalUseCase.GetClassWeights(ctx, classID)
	if len(weights) == 0 && h.gradeRepo != nil {
		weights, _ = h.gradeRepo.GetGeneralWeights(ctx)
	}

	var pdfColumns []pdf.GradebookColumn
	if len(weights) > 0 {
		for _, w := range weights {
			pdfColumns = append(pdfColumns, pdf.GradebookColumn{
				Name:   string(w.Category),
				Weight: w.Weight,
			})
		}
	} else {
		// Standard Default 4 Columns (25% each)
		pdfColumns = []pdf.GradebookColumn{
			{Name: "HOMEWORK & CLASSWORK", Weight: 25},
			{Name: "MID-TERM EXAM", Weight: 25},
			{Name: "END OF TERM EXAM", Weight: 25},
			{Name: "PROJECT / CONTINUOUS", Weight: 25},
		}
	}

	// 8. Fetch Class Grades & Resolve Subject Mappings
	classGrades, _ := h.portalUseCase.GetClassGrades(ctx, classID)
	if h.subjectRepo != nil {
		allSubs, _ := h.subjectRepo.GetAll(ctx)
		subMap := make(map[string]string)
		for _, s := range allSubs {
			subMap[s.ID.String()] = s.Name
			if s.Code != "" {
				subMap[s.Code] = s.Name
			}
		}
		for i := range classGrades {
			if realName, ok := subMap[classGrades[i].Subject]; ok && realName != "" {
				classGrades[i].Subject = realName
			}
		}
	}

	// 9. Build Student Rows & Cumulative Calculations
	type calcRow struct {
		row        pdf.GradebookStudentRow
		cumulative float64
	}

	var computedRows []calcRow
	for _, st := range students {
		var rowScores []float32
		var studentCumulative float64
		evalCount := 0

		for _, col := range pdfColumns {
			var foundScore float32 = 0.0
			scoreMatched := false

			for _, g := range classGrades {
				if g.StudentID == st.ID &&
					matchGradeTerm(g.Term, term) &&
					matchGradeSubject(g.Subject, resolvedSubject, subjectIDQuery, resolvedSubjectCode) &&
					matchGradeCategory(col.Name, string(g.Category)) {
					foundScore = g.Score
					scoreMatched = true
					break
				}
			}

			rowScores = append(rowScores, foundScore)
			if scoreMatched && foundScore > 0 {
				evalCount++
			}

			wFactor := float64(col.Weight) / 100.0
			if col.Weight <= 1.0 && col.Weight > 0 {
				wFactor = float64(col.Weight)
			}
			studentCumulative += float64(foundScore) * wFactor
		}

		cumScore := math.Round(studentCumulative*100) / 100
		letter, remark := pdf.ComputeGradeLetterAndRemark(cumScore)

		stRow := pdf.GradebookStudentRow{
			StudentID:      st.ID.String(),
			EnrollmentNum:  st.EnrollmentNum,
			FullName:       fmt.Sprintf("%s %s", string(st.FirstName), string(st.LastName)),
			Scores:         rowScores,
			Cumulative:     cumScore,
			GradeLetter:    letter,
			Remark:         remark,
			EvaluatedCount: evalCount,
		}

		computedRows = append(computedRows, calcRow{row: stRow, cumulative: cumScore})
	}

	// 10. Class Ranking (handle ties)
	sort.SliceStable(computedRows, func(i, j int) bool {
		return computedRows[i].cumulative > computedRows[j].cumulative
	})

	for i := range computedRows {
		if computedRows[i].cumulative > 0 {
			if i > 0 && computedRows[i].cumulative == computedRows[i-1].cumulative {
				computedRows[i].row.Rank = computedRows[i-1].row.Rank
			} else {
				computedRows[i].row.Rank = i + 1
			}
		}
	}

	// 11. Telemetry Aggregation
	var finalRows []pdf.GradebookStudentRow
	totalEnrolled := len(students)
	evaluatedCount := 0
	totalScoreSum := 0.0
	passCount := 0
	highestScore := 0.0
	lowestScore := 100.0
	colSums := make([]float64, len(pdfColumns))
	colCounts := make([]int, len(pdfColumns))

	for _, cr := range computedRows {
		finalRows = append(finalRows, cr.row)
		if cr.row.EvaluatedCount > 0 || cr.row.Cumulative > 0 {
			evaluatedCount++
			totalScoreSum += cr.row.Cumulative
			if cr.row.Cumulative >= 50.0 {
				passCount++
			}
			if cr.row.Cumulative > highestScore {
				highestScore = cr.row.Cumulative
			}
			if cr.row.Cumulative < lowestScore {
				lowestScore = cr.row.Cumulative
			}
		}
		for cIdx, sc := range cr.row.Scores {
			if sc > 0 {
				colSums[cIdx] += float64(sc)
				colCounts[cIdx]++
			}
		}
	}

	// Sort final rows by rank, then alphabetically
	pdf.SortGradebookRows(finalRows)

	classAverage := 0.0
	if evaluatedCount > 0 {
		classAverage = totalScoreSum / float64(evaluatedCount)
	}

	passRate := 0.0
	if evaluatedCount > 0 {
		passRate = (float64(passCount) / float64(evaluatedCount)) * 100.0
	}

	var colAverages []float64
	for cIdx := range pdfColumns {
		if colCounts[cIdx] > 0 {
			colAverages = append(colAverages, colSums[cIdx]/float64(colCounts[cIdx]))
		} else {
			colAverages = append(colAverages, 0.0)
		}
	}

	// 12. Build GradebookReportData & Render PDF
	reportData := pdf.GradebookReportData{
		Tenant:         tenant,
		Class:          class,
		TeacherName:    teacherName,
		Subject:        resolvedSubject,
		Term:           term,
		AcademicYear:   academicYear,
		Columns:        pdfColumns,
		Rows:           finalRows,
		TotalEnrolled:  totalEnrolled,
		TotalEvaluated: evaluatedCount,
		ClassAverage:   classAverage,
		HighestScore:   highestScore,
		LowestScore:    lowestScore,
		PassRate:       passRate,
		ColumnAverages: colAverages,
	}

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=gradebook-%s-%s.pdf", classID.String(), strings.ReplaceAll(term, " ", "-")))
	c.Header("Content-Type", "application/pdf")

	svc := pdf.NewPDFService()
	if err := svc.GenerateGradebookReport(c.Writer, reportData); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate gradebook PDF: " + err.Error()})
		return
	}
}

func matchGradeTerm(gTerm, targetTerm string) bool {
	if targetTerm == "" {
		return true
	}
	if gTerm == "" {
		return false
	}
	cleanG := strings.ToLower(strings.ReplaceAll(gTerm, " ", ""))
	cleanTarget := strings.ToLower(strings.ReplaceAll(targetTerm, " ", ""))
	if cleanG == cleanTarget {
		return true
	}
	if (strings.Contains(cleanTarget, "first") || strings.Contains(cleanTarget, "1")) &&
		(strings.Contains(cleanG, "first") || strings.Contains(cleanG, "1") || cleanG == "term1" || cleanG == "sem1" || cleanG == "semester1") {
		return true
	}
	if (strings.Contains(cleanTarget, "second") || strings.Contains(cleanTarget, "2")) &&
		(strings.Contains(cleanG, "second") || strings.Contains(cleanG, "2") || cleanG == "term2" || cleanG == "sem2" || cleanG == "semester2") {
		return true
	}
	if (strings.Contains(cleanTarget, "third") || strings.Contains(cleanTarget, "3")) &&
		(strings.Contains(cleanG, "third") || strings.Contains(cleanG, "3") || cleanG == "term3" || cleanG == "sem3" || cleanG == "semester3") {
		return true
	}
	return false
}

func matchGradeCategory(colName string, gradeCategory string) bool {
	if colName == "" || gradeCategory == "" {
		return false
	}
	c1 := strings.ToLower(strings.TrimSpace(colName))
	c2 := strings.ToLower(strings.TrimSpace(gradeCategory))
	if c1 == c2 {
		return true
	}
	if (strings.Contains(c1, "home") || strings.Contains(c1, "assign") || strings.Contains(c1, "class")) &&
		(strings.Contains(c2, "home") || strings.Contains(c2, "assign") || strings.Contains(c2, "class")) {
		return true
	}
	if (strings.Contains(c1, "mid") || strings.Contains(c1, "test") || strings.Contains(c1, "quiz")) &&
		(strings.Contains(c2, "mid") || strings.Contains(c2, "test") || strings.Contains(c2, "quiz")) {
		return true
	}
	if (strings.Contains(c1, "exam") || strings.Contains(c1, "final") || strings.Contains(c1, "end")) &&
		(strings.Contains(c2, "exam") || strings.Contains(c2, "final") || strings.Contains(c2, "end")) {
		return true
	}
	if (strings.Contains(c1, "proj") || strings.Contains(c1, "cont") || strings.Contains(c1, "p")) &&
		(strings.Contains(c2, "proj") || strings.Contains(c2, "cont") || strings.Contains(c2, "p")) {
		return true
	}
	return false
}

func matchGradeSubject(gSub string, targetSub string, targetSubID string, subCode string) bool {
	if targetSub == "" && targetSubID == "" {
		return true
	}
	if targetSub == "All Core Subjects" {
		return true
	}
	if gSub == "" {
		return false
	}
	norm := strings.ToLower(strings.TrimSpace(gSub))
	if targetSub != "" && norm == strings.ToLower(strings.TrimSpace(targetSub)) {
		return true
	}
	if targetSubID != "" && norm == strings.ToLower(strings.TrimSpace(targetSubID)) {
		return true
	}
	if subCode != "" && norm == strings.ToLower(strings.TrimSpace(subCode)) {
		return true
	}
	return false
}

// Classroom Mastery Suite (Phase 1-3)

func (h *TeacherPortalHandler) GetSeatingChart(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID"})
		return
	}
	chart, err := h.portalUseCase.GetSeatingChart(c.Request.Context(), classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if chart == nil {
		c.JSON(http.StatusOK, gin.H{"layout_json": "[]", "rows": 5, "columns": 6})
		return
	}
	c.JSON(http.StatusOK, chart)
}

func (h *TeacherPortalHandler) SaveSeatingChart(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID"})
		return
	}
	var chart domain.SeatingChart
	if err := c.ShouldBindJSON(&chart); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	chart.ClassID = classID
	if err := h.portalUseCase.SaveSeatingChart(c.Request.Context(), &chart); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, chart)
}

func (h *TeacherPortalHandler) GetLessonPlans(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID"})
		return
	}
	plans, err := h.portalUseCase.GetLessonPlans(c.Request.Context(), uuid.Nil, classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, plans)
}

func (h *TeacherPortalHandler) CreateLessonPlan(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID"})
		return
	}
	var plan domain.LessonPlan
	if err := c.ShouldBindJSON(&plan); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	plan.ClassID = classID
	if val, exists := c.Get("userID"); exists {
		plan.TeacherID = val.(uuid.UUID)
	}
	if err := h.portalUseCase.CreateLessonPlan(c.Request.Context(), &plan); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, plan)
}

func (h *TeacherPortalHandler) UpdateLessonPlan(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid plan ID"})
		return
	}
	var plan domain.LessonPlan
	if err := c.ShouldBindJSON(&plan); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	plan.ID = id
	if err := h.portalUseCase.UpdateLessonPlan(c.Request.Context(), &plan); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, plan)
}

func (h *TeacherPortalHandler) GetRubrics(c *gin.Context) {
	rubrics, err := h.portalUseCase.GetRubrics(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rubrics)
}

func (h *TeacherPortalHandler) CreateRubric(c *gin.Context) {
	var rubric domain.GradingRubric
	if err := c.ShouldBindJSON(&rubric); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.portalUseCase.CreateRubric(c.Request.Context(), &rubric); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, rubric)
}

func (h *TeacherPortalHandler) CreateSickbayReferral(c *gin.Context) {
	var referral domain.SickbayReferral
	if err := c.ShouldBindJSON(&referral); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if val, exists := c.Get("userID"); exists {
		referral.TeacherID = val.(uuid.UUID)
	}
	if err := h.portalUseCase.CreateSickbayReferral(c.Request.Context(), &referral); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, referral)
}

func (h *TeacherPortalHandler) GetClassReferrals(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID"})
		return
	}
	referrals, err := h.portalUseCase.GetClassReferrals(c.Request.Context(), classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, referrals)
}

func (h *TeacherPortalHandler) GetClassResources(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID"})
		return
	}
	resources, err := h.portalUseCase.GetClassResources(c.Request.Context(), classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resources)
}

func (h *TeacherPortalHandler) CreateResource(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID"})
		return
	}
	var res domain.TeacherResource
	if err := c.ShouldBindJSON(&res); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	res.ClassID = classID
	if val, exists := c.Get("userID"); exists {
		res.TeacherID = val.(uuid.UUID)
	}
	if err := h.portalUseCase.CreateResource(c.Request.Context(), &res); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, res)
}

// --- TeacherAssignmentHandler for completeness ---

type TeacherAssignmentHandler struct {
	teacherRepo domain.TeacherRepository
}

func NewTeacherAssignmentHandler(rg *gin.RouterGroup, repo domain.TeacherRepository) {
	h := &TeacherAssignmentHandler{teacherRepo: repo}

	a := rg.Group("/teacher-assignments")
	a.GET("", h.ListAll)
	a.POST("", h.Assign)
	a.POST("/bulk", h.BulkAssign)
	a.DELETE("/:id", h.Unassign)
}

func (h *TeacherAssignmentHandler) ListAll(c *gin.Context) {
	assignments, err := h.teacherRepo.GetAllAssignments(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, assignments)
}

func (h *TeacherAssignmentHandler) Assign(c *gin.Context) {
	var a domain.TeacherClassAssignment
	if err := c.ShouldBindJSON(&a); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.teacherRepo.AssignToClass(c.Request.Context(), &a); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, a)
}

func (h *TeacherAssignmentHandler) BulkAssign(c *gin.Context) {
	var assignments []domain.TeacherClassAssignment
	if err := c.ShouldBindJSON(&assignments); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.teacherRepo.BulkAssignToClass(c.Request.Context(), assignments); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Bulk assignments successful", "count": len(assignments)})
}

func (h *TeacherAssignmentHandler) Unassign(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid assignment ID format"})
		return
	}
	if err := h.teacherRepo.UnassignFromClass(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "assignment removed"})
}

// Teacher Cover Requests (Feature 37)
func (h *TeacherPortalHandler) CreateCoverRequest(c *gin.Context) {
	var req domain.TeacherCoverRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if err := h.portalUseCase.CreateCoverRequest(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create cover request"})
		return
	}

	c.JSON(http.StatusCreated, req)
}

func (h *TeacherPortalHandler) GetCoverRequests(c *gin.Context) {
	requests, err := h.portalUseCase.GetCoverRequests(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch cover requests"})
		return
	}

	c.JSON(http.StatusOK, requests)
}

func (h *TeacherPortalHandler) ClaimCoverRequest(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cover request ID"})
		return
	}

	var body struct {
		CoverTeacherID string `json:"cover_teacher_id"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cover teacher ID required"})
		return
	}

	coverTeacherID, err := uuid.Parse(body.CoverTeacherID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid teacher ID"})
		return
	}

	if err := h.portalUseCase.ClaimCoverRequest(c.Request.Context(), id, coverTeacherID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to claim cover request"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "CLAIMED"})
}
