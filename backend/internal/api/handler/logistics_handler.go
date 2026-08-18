package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/user/high-school-management/backend/internal/domain"
)

type LogisticsHandler struct {
	logisticsUseCase domain.LogisticsUseCase
}

func NewLogisticsHandler(r *gin.RouterGroup, usecase domain.LogisticsUseCase) {
	handler := &LogisticsHandler{logisticsUseCase: usecase}

	logistics := r.Group("/logistics")
	{
		// Transport
		logistics.GET("/routes", handler.GetRoutes)
		logistics.POST("/routes", handler.AddRoute)
		logistics.GET("/transport/student/:studentId", handler.GetStudentTransport)
		logistics.POST("/transport/assign", handler.AssignTransport)

		// Canteen
		logistics.GET("/meal-plans", handler.GetMealPlans)
		logistics.POST("/meal-plans", handler.AddMealPlan)
		logistics.GET("/canteen/student/:studentId", handler.GetStudentCanteen)
		logistics.POST("/canteen/subscribe", handler.SubscribeCanteen)
	}
}

func (h *LogisticsHandler) GetRoutes(c *gin.Context) {
	routes, err := h.logisticsUseCase.GetAllRoutes(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, routes)
}

func (h *LogisticsHandler) AddRoute(c *gin.Context) {
	var route domain.TransportRoute
	if err := c.ShouldBindJSON(&route); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.logisticsUseCase.AddRoute(c.Request.Context(), &route); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, route)
}

func (h *LogisticsHandler) GetStudentTransport(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("studentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student ID"})
		return
	}
	assignment, err := h.logisticsUseCase.GetTransportForStudent(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, assignment)
}

func (h *LogisticsHandler) AssignTransport(c *gin.Context) {
	var assignment domain.BusAssignment
	if err := c.ShouldBindJSON(&assignment); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.logisticsUseCase.AssignStudentToBus(c.Request.Context(), &assignment); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, assignment)
}

func (h *LogisticsHandler) GetMealPlans(c *gin.Context) {
	plans, err := h.logisticsUseCase.GetAllMealPlans(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, plans)
}

func (h *LogisticsHandler) AddMealPlan(c *gin.Context) {
	var plan domain.MealPlan
	if err := c.ShouldBindJSON(&plan); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.logisticsUseCase.AddMealPlan(c.Request.Context(), &plan); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, plan)
}

func (h *LogisticsHandler) GetStudentCanteen(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("studentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student ID"})
		return
	}
	sub, err := h.logisticsUseCase.GetSubscriptionForStudent(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, sub)
}

func (h *LogisticsHandler) SubscribeCanteen(c *gin.Context) {
	var sub domain.CanteenSubscription
	if err := c.ShouldBindJSON(&sub); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.logisticsUseCase.SubscribeStudent(c.Request.Context(), &sub); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, sub)
}
