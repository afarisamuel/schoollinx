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

type ClassHandler struct {
	classUseCase domain.ClassUseCase
	classRepo    domain.ClassRepository
	gradeRepo    domain.GradeRepository
	studentRepo  domain.StudentRepository
	tenantRepo   domain.TenantRepository
	academicRepo domain.AcademicPeriodRepository
}

func NewClassHandler(
	r *gin.RouterGroup,
	cuc domain.ClassUseCase,
	cr domain.ClassRepository,
	gr domain.GradeRepository,
	sr domain.StudentRepository,
	tr domain.TenantRepository,
	ar domain.AcademicPeriodRepository,
) {
	h := &ClassHandler{
		classUseCase: cuc,
		classRepo:    cr,
		gradeRepo:    gr,
		studentRepo:  sr,
		tenantRepo:   tr,
		academicRepo: ar,
	}

	g := r.Group("/classes")
	{
		g.GET("", h.ListClasses)
		g.POST("", h.CreateClass)
		g.GET("/:id", h.GetClass)
		g.PUT("/:id", h.UpdateClass)
		g.DELETE("/:id", h.DeleteClass)

		// Phase 19: Term Locks
		g.GET("/:id/locks", h.GetClassLocks)
		g.POST("/:id/locks", h.UpsertClassLock)

		// Subject assignments
		g.GET("/:id/subjects", h.GetClassSubjects)
		g.PUT("/:id/subjects", h.SetClassSubjects)

		// Class Ranking PDF (admin)
		g.GET("/:id/ranking/export", h.ExportClassRankingPDF)
	}
}

func (h *ClassHandler) ListClasses(c *gin.Context) {
	role, exists := c.Get("role")
	if exists && role == domain.RoleTeacher {
		userIDVal, uExists := c.Get("userID")
		if uExists {
			userID := userIDVal.(uuid.UUID)
			classes, err := h.classUseCase.GetClassesForTeacher(c.Request.Context(), userID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			if len(classes) == 0 {
				// If teacher has no specific class allocations yet, fall back to institutional classes so they aren't locked out
				classes, _ = h.classUseCase.GetAllClasses(c.Request.Context())
			}
			if classes == nil {
				classes = []domain.Class{}
			}
			c.JSON(http.StatusOK, classes)
			return
		}
	}

	classes, err := h.classUseCase.GetAllClasses(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, classes)
}

func (h *ClassHandler) CreateClass(c *gin.Context) {
	var class domain.Class
	if err := c.ShouldBindJSON(&class); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.classUseCase.CreateClass(c.Request.Context(), &class); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, class)
}

func (h *ClassHandler) GetClass(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class ID format"})
		return
	}
	class, err := h.classUseCase.GetClassByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Class not found"})
		return
	}
	c.JSON(http.StatusOK, class)
}

func (h *ClassHandler) UpdateClass(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class ID format"})
		return
	}
	var class domain.Class
	if err := c.ShouldBindJSON(&class); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	class.ID = id
	if err := h.classUseCase.UpdateClass(c.Request.Context(), &class); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, class)
}

func (h *ClassHandler) DeleteClass(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class ID format"})
		return
	}
	if err := h.classUseCase.DeleteClass(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Class deleted"})
}


func (h *ClassHandler) GetClassLocks(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class ID format"})
		return
	}
	locks, err := h.classRepo.GetLocks(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, locks)
}

func (h *ClassHandler) UpsertClassLock(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class ID format"})
		return
	}
	var lock domain.ClassTermLock
	if err := c.ShouldBindJSON(&lock); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	lock.ClassID = id

	if err := h.classRepo.UpsertLock(c.Request.Context(), &lock); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, lock)
}

func (h *ClassHandler) GetClassSubjects(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class ID format"})
		return
	}
	subjects, err := h.classRepo.GetClassSubjects(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if subjects == nil {
		subjects = []domain.Subject{}
	}
	c.JSON(http.StatusOK, subjects)
}

func (h *ClassHandler) SetClassSubjects(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class ID format"})
		return
	}
	var req struct {
		SubjectIDs []uuid.UUID `json:"subject_ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.classRepo.SetClassSubjects(c.Request.Context(), id, req.SubjectIDs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Subjects updated successfully"})
}

// ExportClassRankingPDF generates an official class ranking league-table PDF across all subjects for a class term.
// Route: GET /api/classes/:id/ranking/export?term=...&period_id=...
func (h *ClassHandler) ExportClassRankingPDF(c *gin.Context) {
	ctx := c.Request.Context()

	classID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class ID format"})
		return
	}

	term := strings.TrimSpace(c.Query("term"))
	periodIDQuery := strings.TrimSpace(c.Query("period_id"))

	// 1. Fetch class
	var class *domain.Class
	if h.classRepo != nil {
		class, _ = h.classRepo.GetByID(ctx, classID)
	}

	// 2. Fetch students
	var students []domain.Student
	if h.studentRepo != nil {
		students, err = h.studentRepo.GetByClass(ctx, classID)
	}
	if err != nil || len(students) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "No enrolled students found in this class"})
		return
	}

	// 3. Fetch tenant
	var tenant *domain.Tenant
	if h.tenantRepo != nil {
		if val, exists := ctx.Value(middleware.TenantIDKey).(uuid.UUID); exists && val != uuid.Nil {
			tenant, _ = h.tenantRepo.GetByID(ctx, val)
		}
	}

	// 4. Resolve academic year and term
	academicYear := ""
	if h.academicRepo != nil {
		if periodIDQuery != "" {
			if pID, err2 := uuid.Parse(periodIDQuery); err2 == nil {
				if p, err2 := h.academicRepo.GetByID(ctx, pID); err2 == nil && p != nil {
					academicYear = p.Name
				}
			}
		}
		if academicYear == "" {
			if activeP, err2 := h.academicRepo.GetActive(ctx); err2 == nil && activeP != nil {
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

	// 5. Resolve teacher name
	teacherName := "Class Teacher"
	if class != nil && class.Teacher != nil {
		teacherName = fmt.Sprintf("%s %s", string(class.Teacher.FirstName), string(class.Teacher.LastName))
	}

	// 6. Fetch all grades for this class
	allGrades, err := h.gradeRepo.GetByClassID(ctx, classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch class grades"})
		return
	}

	// 7. Filter by term (case-insensitive) and collect distinct subjects
	termLower := strings.ToLower(term)
	subjSet := map[string]struct{}{}
	var filteredGrades []domain.Grade
	for _, g := range allGrades {
		if strings.ToLower(g.Term) == termLower {
			filteredGrades = append(filteredGrades, g)
			subjSet[g.Subject] = struct{}{}
		}
	}

	// Sort subjects alphabetically for consistent column order
	subjectNames := make([]string, 0, len(subjSet))
	for s := range subjSet {
		subjectNames = append(subjectNames, s)
	}
	sort.Strings(subjectNames)

	subjIdx := map[string]int{}
	for i, s := range subjectNames {
		subjIdx[s] = i
	}

	// 8. Build student ID -> index map
	studentIdx := map[uuid.UUID]int{}
	for i, s := range students {
		studentIdx[s.ID] = i
	}

	// 9. Pivot grades: student x subject -> list of (score, maxScore)
	type scoreEntry struct{ score, maxScore float32 }
	pivot := make([][][]scoreEntry, len(students))
	for i := range pivot {
		pivot[i] = make([][]scoreEntry, len(subjectNames))
	}
	for _, g := range filteredGrades {
		si, ok1 := studentIdx[g.StudentID]
		cj, ok2 := subjIdx[g.Subject]
		if !ok1 || !ok2 {
			continue
		}
		pivot[si][cj] = append(pivot[si][cj], scoreEntry{g.Score, g.MaxScore})
	}

	// 10. Compute per-student, per-subject weighted average -> normalize to 100
	//     Then total = average of all subject finals
	type rankRow struct {
		Student       domain.Student
		SubjectScores []float64
		Total         float64
	}

	rows := make([]rankRow, len(students))
	for si, student := range students {
		scores := make([]float64, len(subjectNames))
		subjWithData := 0
		totalSum := 0.0
		for cj := range subjectNames {
			entries := pivot[si][cj]
			if len(entries) == 0 {
				continue
			}
			var sumScore, sumMax float32
			for _, e := range entries {
				if e.maxScore <= 0 {
					e.maxScore = 100
				}
				sumScore += e.score
				sumMax += e.maxScore
			}
			norm := float64(sumScore) / float64(sumMax) * 100.0
			scores[cj] = math.Round(norm*10) / 10
			totalSum += norm
			subjWithData++
		}
		var avg float64
		if subjWithData > 0 {
			avg = math.Round((totalSum/float64(subjWithData))*10) / 10
		}
		rows[si] = rankRow{Student: student, SubjectScores: scores, Total: avg}
	}

	// 11. Sort by total descending, then name ascending as tiebreak
	sort.Slice(rows, func(i, j int) bool {
		if rows[i].Total != rows[j].Total {
			return rows[i].Total > rows[j].Total
		}
		return rows[i].Student.LastName < rows[j].Student.LastName
	})

	// 12. Compute per-subject class averages
	classAvg := make([]float64, len(subjectNames))
	subjCounts := make([]int, len(subjectNames))
	for _, r := range rows {
		for cj, score := range r.SubjectScores {
			if score > 0 {
				classAvg[cj] += score
				subjCounts[cj]++
			}
		}
	}
	var overallSum float64
	overallCount := 0
	for cj := range classAvg {
		if subjCounts[cj] > 0 {
			classAvg[cj] = math.Round((classAvg[cj]/float64(subjCounts[cj]))*10) / 10
			overallSum += classAvg[cj]
			overallCount++
		}
	}
	overallAvg := 0.0
	if overallCount > 0 {
		overallAvg = math.Round((overallSum/float64(overallCount))*10) / 10
	}

	// 13. Build PDF rows with tied-rank logic
	pdfRows := make([]pdf.ClassRankingStudentRow, len(rows))
	pos := 1
	for i, r := range rows {
		if i > 0 && r.Total != rows[i-1].Total {
			pos = i + 1
		}
		admNum := r.Student.EnrollmentNum
		if admNum == "" {
			admNum = r.Student.ID.String()[:8]
		}
		letter, _ := pdf.ComputeGradeLetterAndRemark(r.Total)
		pdfRows[i] = pdf.ClassRankingStudentRow{
			Position:      pos,
			AdmissionNum:  admNum,
			FullName:      fmt.Sprintf("%s %s", string(r.Student.FirstName), string(r.Student.LastName)),
			SubjectScores: r.SubjectScores,
			Total:         r.Total,
			GradeLetter:   letter,
		}
	}

	// 14. Render PDF
	reportData := pdf.ClassRankingReportData{
		Tenant:       tenant,
		Class:        class,
		TeacherName:  teacherName,
		Term:         term,
		AcademicYear: academicYear,
		Subjects:     subjectNames,
		Rows:         pdfRows,
		ClassAvg:     classAvg,
		OverallAvg:   overallAvg,
	}

	classLabel := classID.String()
	if class != nil {
		classLabel = strings.ReplaceAll(class.Name, " ", "-")
	}
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=ranking-%s-%s.pdf", classLabel, strings.ReplaceAll(term, " ", "-")))
	c.Header("Content-Type", "application/pdf")

	svc := pdf.NewPDFService()
	if err := svc.GenerateClassRankingReport(c.Writer, reportData); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate ranking PDF: " + err.Error()})
		return
	}
}

