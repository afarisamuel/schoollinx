package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type ExamHandler struct {
	useCase domain.ExamUseCase
}

func NewExamHandler(useCase domain.ExamUseCase) *ExamHandler {
	return &ExamHandler{useCase: useCase}
}

func (h *ExamHandler) RegisterRoutes(api *gin.RouterGroup, middleware ...gin.HandlerFunc) {
	exams := api.Group("/exams")
	for _, m := range middleware {
		exams.Use(m)
	}
	{
		exams.POST("", h.CreateExam)
		exams.GET("", h.GetExams)
		exams.GET("/:id", h.GetExamByID)
		exams.PUT("/:id", h.UpdateExam)
		
		exams.POST("/:id/schedules", h.AddSchedule)
		exams.GET("/:id/schedules", h.GetSchedules)
		
		exams.POST("/schedules/:scheduleId/results", h.SubmitResults)
		exams.GET("/schedules/:scheduleId/results", h.GetResults)
	}
}

func (h *ExamHandler) CreateExam(c *gin.Context) {
	var exam domain.Exam
	if err := c.ShouldBindJSON(&exam); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if err := h.useCase.CreateExam(c.Request.Context(), &exam); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create exam"})
		return
	}

	c.JSON(http.StatusCreated, exam)
}

func (h *ExamHandler) GetExams(c *gin.Context) {
	exams, err := h.useCase.GetExams(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch exams"})
		return
	}

	c.JSON(http.StatusOK, exams)
}

func (h *ExamHandler) GetExamByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid exam ID format"})
		return
	}

	exam, err := h.useCase.GetExamByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exam not found"})
		return
	}

	c.JSON(http.StatusOK, exam)
}

func (h *ExamHandler) UpdateExam(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid exam ID format"})
		return
	}

	exam, err := h.useCase.GetExamByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exam not found"})
		return
	}

	if err := c.ShouldBindJSON(exam); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if err := h.useCase.UpdateExam(c.Request.Context(), exam); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update exam"})
		return
	}

	c.JSON(http.StatusOK, exam)
}

func (h *ExamHandler) AddSchedule(c *gin.Context) {
	examID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid exam ID format"})
		return
	}

	var schedule domain.ExamSchedule
	if err := c.ShouldBindJSON(&schedule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}
	schedule.ExamID = examID

	if err := h.useCase.AddSchedule(c.Request.Context(), &schedule); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add schedule"})
		return
	}

	c.JSON(http.StatusCreated, schedule)
}

func (h *ExamHandler) GetSchedules(c *gin.Context) {
	examID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid exam ID format"})
		return
	}

	schedules, err := h.useCase.GetExamSchedules(c.Request.Context(), examID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch schedules"})
		return
	}

	c.JSON(http.StatusOK, schedules)
}

func (h *ExamHandler) SubmitResults(c *gin.Context) {
	scheduleID, err := uuid.Parse(c.Param("scheduleId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid schedule ID format"})
		return
	}

	var payload struct {
		Results []domain.ExamResult `json:"results"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	for i := range payload.Results {
		payload.Results[i].ExamScheduleID = scheduleID
	}

	if err := h.useCase.SubmitResults(c.Request.Context(), scheduleID, payload.Results); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit results"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Results submitted successfully"})
}

func (h *ExamHandler) GetResults(c *gin.Context) {
	scheduleID, err := uuid.Parse(c.Param("scheduleId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid schedule ID format"})
		return
	}

	results, err := h.useCase.GetScheduleResults(c.Request.Context(), scheduleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch results"})
		return
	}

	c.JSON(http.StatusOK, results)
}
