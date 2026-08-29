package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
)

type HomeworkHandler struct {
	useCase domain.HomeworkUseCase
}

func NewHomeworkHandler(r *gin.RouterGroup, useCase domain.HomeworkUseCase) {
	h := &HomeworkHandler{useCase: useCase}

	g := r.Group("/homework")
	{
		g.POST("", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleTeacher), h.Create)
		g.PUT("/:id", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleTeacher), h.Update)
		g.DELETE("/:id", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleTeacher), h.Delete)
		g.GET("/:id", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleTeacher, domain.RoleStudent, domain.RoleGuardian), h.GetByID)
		g.GET("/class/:id", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleTeacher, domain.RoleStudent, domain.RoleGuardian), h.GetByClass)
		g.GET("/teacher/:id", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleTeacher), h.GetByTeacher)
		
		// Submissions
		g.POST("/:id/submissions", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleTeacher, domain.RoleStudent), h.Submit)
		g.GET("/:id/submissions", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleTeacher), h.GetSubmissions)
		g.GET("/:id/submissions/student/:student_id", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleTeacher, domain.RoleStudent, domain.RoleGuardian), h.GetStudentSubmission)
		g.PUT("/submissions/:submission_id/grade", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleTeacher), h.Grade)
		g.POST("/:id/check-similarity", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleTeacher), h.CheckSimilarity)
	}
}

func (h *HomeworkHandler) Create(c *gin.Context) {
	var req domain.Homework
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.useCase.CreateHomework(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, req)
}

func (h *HomeworkHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid homework ID"})
		return
	}

	var req domain.Homework
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.ID = id

	if err := h.useCase.UpdateHomework(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, req)
}

func (h *HomeworkHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid homework ID"})
		return
	}

	if err := h.useCase.DeleteHomework(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Homework deleted"})
}

func (h *HomeworkHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid homework ID"})
		return
	}

	hw, err := h.useCase.GetHomeworkByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Homework not found"})
		return
	}

	c.JSON(http.StatusOK, hw)
}

func (h *HomeworkHandler) GetByClass(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class ID"})
		return
	}

	hw, err := h.useCase.GetHomeworksByClass(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, hw)
}

func (h *HomeworkHandler) GetByTeacher(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid teacher ID"})
		return
	}

	hw, err := h.useCase.GetHomeworksByTeacher(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, hw)
}

func (h *HomeworkHandler) Submit(c *gin.Context) {
	hwID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid homework ID"})
		return
	}

	var req domain.HomeworkSubmission
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.HomeworkID = hwID

	if err := h.useCase.SubmitAssignment(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, req)
}

func (h *HomeworkHandler) GetSubmissions(c *gin.Context) {
	hwID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid homework ID"})
		return
	}

	subs, err := h.useCase.GetHomeworkSubmissions(c.Request.Context(), hwID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, subs)
}

func (h *HomeworkHandler) GetStudentSubmission(c *gin.Context) {
	hwID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid homework ID"})
		return
	}

	studentID, err := uuid.Parse(c.Param("student_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	sub, err := h.useCase.GetStudentSubmission(c.Request.Context(), hwID, studentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Submission not found"})
		return
	}

	c.JSON(http.StatusOK, sub)
}

func (h *HomeworkHandler) Grade(c *gin.Context) {
	subID, err := uuid.Parse(c.Param("submission_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission ID"})
		return
	}

	var req struct {
		Score    float64 `json:"score"`
		Feedback string  `json:"feedback"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.useCase.GradeAssignment(c.Request.Context(), subID, req.Score, req.Feedback); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Submission graded successfully"})
}

func (h *HomeworkHandler) CheckSimilarity(c *gin.Context) {
	hwID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid homework ID"})
		return
	}

	matches, err := h.useCase.CheckSubmissionsSimilarity(c.Request.Context(), hwID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check submissions similarity"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"homework_id":   hwID,
		"comparisons":   len(matches),
		"flagged_count": countFlagged(matches),
		"matches":       matches,
	})
}

func countFlagged(matches []domain.HomeworkSimilarityMatch) int {
	c := 0
	for _, m := range matches {
		if m.IsFlagged {
			c++
		}
	}
	return c
}
