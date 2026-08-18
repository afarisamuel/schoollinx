package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type GradeHandler struct {
	gradeUseCase domain.GradeUseCase
}

func NewGradeHandler(r *gin.RouterGroup, useCase domain.GradeUseCase) {
	h := &GradeHandler{gradeUseCase: useCase}

	g := r.Group("/grades")
	{
		g.POST("", h.AddGrade)
		g.GET("/student/:student_id", h.GetStudentGrades)
		g.GET("/student/:student_id/trajectory", h.GetStudentTrajectory)
		g.GET("/class/:class_id", h.GetClassGrades)
		g.GET("/weights/:class_id", h.GetClassWeights)
		g.POST("/weights", h.UpsertWeight)
		g.PUT("/:id", h.UpdateGrade)
		g.DELETE("/:id", h.DeleteGrade)
		g.POST("/bulk", h.BulkCreate)
	}
}

// AddGrade godoc
// @Summary      Create a grade record
// @Description  Adds a single grade entry for a student in a subject
// @Tags         Grades
// @Accept       json
// @Produce      json
// @Param        body  body      domain.Grade  true  "Grade payload"
// @Success      201   {object}  domain.Grade
// @Failure      400   {object}  map[string]string
// @Failure      500   {object}  map[string]string
// @Router       /grades [post]
func (h *GradeHandler) AddGrade(c *gin.Context) {
	var grade domain.Grade
	if err := c.ShouldBindJSON(&grade); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.gradeUseCase.AddGrade(c.Request.Context(), &grade)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, grade)
}

// GetStudentGrades godoc
// @Summary      Get all grades for a student
// @Description  Returns every grade record belonging to the given student
// @Tags         Grades
// @Produce      json
// @Param        student_id  path      string  true  "Student UUID"
// @Success      200         {array}   domain.Grade
// @Failure      400         {object}  map[string]string
// @Failure      500         {object}  map[string]string
// @Router       /grades/student/{student_id} [get]
func (h *GradeHandler) GetStudentGrades(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("student_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID format"})
		return
	}

	grades, err := h.gradeUseCase.GetStudentGrades(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, grades)
}

// GetStudentTrajectory godoc
// @Summary      Get a student's grade trajectory
// @Description  Returns term-over-term average grade data for charting performance trends
// @Tags         Grades
// @Produce      json
// @Param        student_id  path      string  true  "Student UUID"
// @Success      200         {array}   map[string]interface{}
// @Failure      400         {object}  map[string]string
// @Failure      500         {object}  map[string]string
// @Router       /grades/student/{student_id}/trajectory [get]
func (h *GradeHandler) GetStudentTrajectory(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("student_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID format"})
		return
	}

	trajectory, err := h.gradeUseCase.GetStudentGradeTrajectory(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, trajectory)
}

// GetClassGrades godoc
// @Summary      Get all grades for a class
// @Description  Returns every grade record for all students in the specified class
// @Tags         Grades
// @Produce      json
// @Param        class_id  path      string  true  "Class UUID"
// @Success      200       {array}   domain.Grade
// @Failure      400       {object}  map[string]string
// @Failure      500       {object}  map[string]string
// @Router       /grades/class/{class_id} [get]
func (h *GradeHandler) GetClassGrades(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class ID format"})
		return
	}

	grades, err := h.gradeUseCase.GetClassGrades(c.Request.Context(), classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, grades)
}

// UpdateGrade godoc
// @Summary      Update a grade record
// @Description  Updates the score, remarks, or category of an existing grade entry
// @Tags         Grades
// @Accept       json
// @Produce      json
// @Param        id    path      string        true  "Grade UUID"
// @Param        body  body      domain.Grade  true  "Updated grade data"
// @Success      200   {object}  domain.Grade
// @Failure      400   {object}  map[string]string
// @Failure      500   {object}  map[string]string
// @Router       /grades/{id} [put]
func (h *GradeHandler) UpdateGrade(c *gin.Context) {
	var grade domain.Grade
	if err := c.ShouldBindJSON(&grade); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid grade ID format"})
		return
	}
	grade.ID = id

	err = h.gradeUseCase.UpdateGrade(c.Request.Context(), &grade)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, grade)
}

// DeleteGrade godoc
// @Summary      Delete a grade record
// @Description  Permanently removes a grade entry by ID
// @Tags         Grades
// @Produce      json
// @Param        id  path      string  true  "Grade UUID"
// @Success      200 {object}  map[string]string
// @Failure      400 {object}  map[string]string
// @Failure      500 {object}  map[string]string
// @Router       /grades/{id} [delete]
func (h *GradeHandler) DeleteGrade(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid grade ID format"})
		return
	}

	err = h.gradeUseCase.DeleteGrade(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Grade deleted successfully"})
}

// BulkCreate godoc
// @Summary      Bulk-import grade records
// @Description  Inserts multiple grade entries in a single request; partial failures are reported per row
// @Tags         Grades
// @Accept       json
// @Produce      json
// @Param        body  body      []domain.Grade  true  "Array of grade payloads"
// @Success      201   {object}  map[string]interface{}
// @Failure      400   {object}  map[string]string
// @Failure      500   {object}  map[string]string
// @Router       /grades/bulk [post]
func (h *GradeHandler) BulkCreate(c *gin.Context) {
	var grades []domain.Grade
	if err := c.ShouldBindJSON(&grades); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	imported, errs, err := h.gradeUseCase.BulkCreateGrades(c.Request.Context(), grades)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"imported": imported,
		"errors":   errs,
	})
}

// GetClassWeights godoc
// @Summary      Get grading weights for a class
// @Description  Returns the category weighting configuration (e.g. exam 60%, CA 40%) for the specified class
// @Tags         Grades
// @Produce      json
// @Param        class_id  path      string  true  "Class UUID"
// @Success      200       {array}   domain.GradeWeight
// @Failure      400       {object}  map[string]string
// @Failure      500       {object}  map[string]string
// @Router       /grades/weights/{class_id} [get]
func (h *GradeHandler) GetClassWeights(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class ID format"})
		return
	}

	weights, err := h.gradeUseCase.GetWeightsByClassID(c.Request.Context(), classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, weights)
}

// UpsertWeight godoc
// @Summary      Create or update a grading weight
// @Description  Sets the percentage weight for a grade category within a class
// @Tags         Grades
// @Accept       json
// @Produce      json
// @Param        body  body      domain.GradeWeight  true  "Weight payload"
// @Success      200   {object}  domain.GradeWeight
// @Failure      400   {object}  map[string]string
// @Failure      500   {object}  map[string]string
// @Router       /grades/weights [post]
func (h *GradeHandler) UpsertWeight(c *gin.Context) {
	var weight domain.GradeWeight
	if err := c.ShouldBindJSON(&weight); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.gradeUseCase.UpsertWeight(c.Request.Context(), &weight)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, weight)
}
