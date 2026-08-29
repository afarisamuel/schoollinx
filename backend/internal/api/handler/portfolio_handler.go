package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
)

type PortfolioHandler struct {
	useCase domain.PortfolioUseCase
}

func NewPortfolioHandler(api *gin.RouterGroup, uc domain.PortfolioUseCase) {
	h := &PortfolioHandler{useCase: uc}
	students := api.Group("/students")
	{
		students.GET("/:id/portfolio", h.GetPortfolio)
		students.PUT("/:id/portfolio", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleTeacher), h.SavePortfolio)
		students.POST("/:id/portfolio/achievements", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleTeacher), h.AddAchievement)
		students.DELETE("/:id/portfolio/achievements/:achievementId", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleTeacher), h.DeleteAchievement)
	}
}

func (h *PortfolioHandler) GetPortfolio(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	portfolio, err := h.useCase.GetStudentPortfolio(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch portfolio"})
		return
	}

	c.JSON(http.StatusOK, portfolio)
}

func (h *PortfolioHandler) SavePortfolio(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	var portfolio domain.StudentPortfolio
	if err := c.ShouldBindJSON(&portfolio); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if err := h.useCase.SaveStudentPortfolio(c.Request.Context(), id, &portfolio); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save portfolio"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Portfolio saved"})
}

func (h *PortfolioHandler) AddAchievement(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	var achievement domain.PortfolioAchievement
	if err := c.ShouldBindJSON(&achievement); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if err := h.useCase.AddAchievement(c.Request.Context(), id, &achievement); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add achievement"})
		return
	}

	c.JSON(http.StatusCreated, achievement)
}

func (h *PortfolioHandler) DeleteAchievement(c *gin.Context) {
	achievementID, err := uuid.Parse(c.Param("achievementId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid achievement ID"})
		return
	}

	if err := h.useCase.DeleteAchievement(c.Request.Context(), achievementID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete achievement"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Achievement deleted"})
}
