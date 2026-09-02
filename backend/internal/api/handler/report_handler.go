package handler

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/pdf"
)

type ReportHandler struct {
	pdfService     *pdf.PDFService
	studentRepo    domain.StudentRepository
	gradeRepo      domain.GradeRepository
	tenantRepo     domain.TenantRepository
	evalRepo       domain.TerminalEvaluationRepository
	academicRepo   domain.AcademicPeriodRepository
	teacherRepo    domain.TeacherRepository
	classRepo      domain.ClassRepository
	subjectRepo    domain.SubjectRepository
	attendanceRepo domain.AttendanceRepository
}

func NewReportHandler(
	r *gin.RouterGroup, 
	ps *pdf.PDFService, 
	studentRepo domain.StudentRepository, 
	gradeRepo domain.GradeRepository,
	tenantRepo domain.TenantRepository,
	evalRepo domain.TerminalEvaluationRepository,
	academicRepo domain.AcademicPeriodRepository,
	teacherRepo domain.TeacherRepository,
	classRepo domain.ClassRepository,
	subjectRepo domain.SubjectRepository,
	attendanceRepo domain.AttendanceRepository,
) {
	h := &ReportHandler{
		pdfService:     ps,
		studentRepo:    studentRepo,
		gradeRepo:      gradeRepo,
		tenantRepo:     tenantRepo,
		evalRepo:       evalRepo,
		academicRepo:   academicRepo,
		teacherRepo:    teacherRepo,
		classRepo:      classRepo,
		subjectRepo:    subjectRepo,
		attendanceRepo: attendanceRepo,
	}

	g := r.Group("/reports")
	{
		g.GET("/students/:id/transcript", h.DownloadTranscript) // Deprecated but kept for compatibility
		g.GET("/students/:id/document", h.GenerateDocument)
		g.GET("/students/:id/id-card", h.DownloadStudentIDCard)
		g.GET("/students/:id/terminal", h.GenerateTerminalReportHandler)
		g.GET("/ministry/export", h.ExportMinistryData)
	}
}

func (h *ReportHandler) GenerateDocument(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student ID format"})
		return
	}
	docType := domain.DocumentType(c.Query("type"))

	if docType == "" {
		docType = domain.DocTranscript
	}

	student, err := h.studentRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "student not found"})
		return
	}

	grades, err := h.gradeRepo.GetAll(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get grades"})
		return
	}
	
	// Filter grades for this student
	var studentGrades []domain.Grade
	for _, g := range grades {
		if g.StudentID == id {
			studentGrades = append(studentGrades, g)
		}
	}

	// Resolve subject IDs / UUIDs to real human-readable Subject Names
	if h.subjectRepo != nil {
		allSubjects, _ := h.subjectRepo.GetAll(c.Request.Context())
		subjectNameMap := make(map[string]string)
		for _, s := range allSubjects {
			subjectNameMap[s.ID.String()] = s.Name
			if s.Code != "" {
				subjectNameMap[s.Code] = s.Name
			}
			subjectNameMap[s.Name] = s.Name
		}
		for i := range studentGrades {
			subjKey := studentGrades[i].Subject
			if realName, ok := subjectNameMap[subjKey]; ok && realName != "" {
				studentGrades[i].Subject = realName
			} else if u, err := uuid.Parse(subjKey); err == nil {
				if sub, err := h.subjectRepo.GetByID(c.Request.Context(), u); err == nil && sub != nil && sub.Name != "" {
					studentGrades[i].Subject = sub.Name
					subjectNameMap[subjKey] = sub.Name
				}
			}
		}
	}

	stats := map[string]int{
		"present": 0,
		"absent":  0,
		"tardy":   0,
	}

	c.Header("Content-Type", "application/pdf")
	filename := fmt.Sprintf("%s_%s.pdf", docType, id.String())
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	if err := h.pdfService.GenerateDocument(c.Writer, docType, student, studentGrades, stats); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate document"})
		return
	}
}

func (h *ReportHandler) DownloadTranscript(c *gin.Context) {
	h.GenerateDocument(c)
}

func (h *ReportHandler) DownloadStudentIDCard(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student ID format"})
		return
	}

	student, err := h.studentRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "student not found"})
		return
	}

	c.Header("Content-Type", "application/pdf")
	filename := fmt.Sprintf("ID_Card_%s.pdf", id.String())
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	schoolName := "Basic SMS Institution" // From tenant config in reality
	if err := h.pdfService.GenerateStudentIDCard(c.Writer, student, schoolName); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate ID card"})
		return
	}
}

func (h *ReportHandler) ExportMinistryData(c *gin.Context) {
	students, err := h.studentRepo.GetAll(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get students"})
		return
	}

	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=MoE_Export_2026.csv")

	// Write CSV headers
	c.Writer.Write([]byte("School Code,Student ID,First Name,Last Name,Gender,Level,Status\n"))

	for _, s := range students {
		line := fmt.Sprintf("SCH-001,%s,%s,%s,%s,%d,%s\n", s.EnrollmentNum, s.FirstName, s.LastName, s.Gender, s.Level, s.Status)
		c.Writer.Write([]byte(line))
	}
}
