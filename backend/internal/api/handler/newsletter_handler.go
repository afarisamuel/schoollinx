package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type NewsletterHandler struct {
	uc domain.NewsletterUseCase
}

func NewNewsletterHandler(r *gin.RouterGroup, uc domain.NewsletterUseCase) {
	h := &NewsletterHandler{uc: uc}

	g := r.Group("/newsletter")
	{
		g.GET("/", h.GetNewsletters)
		g.POST("/generate", h.GenerateWeekly)
		g.POST("/custom", h.CreateCustom)
		g.POST("/:id/send", h.SendNewsletter)

		g.POST("/subscribe", h.Subscribe)
		g.DELETE("/unsubscribe/:guardian_id", h.Unsubscribe)
	}
}

func (h *NewsletterHandler) GetNewsletters(c *gin.Context) {
	list, err := h.uc.GetNewsletters(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *NewsletterHandler) GenerateWeekly(c *gin.Context) {
	n, err := h.uc.GenerateWeeklyNewsletter(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, n)
}

func (h *NewsletterHandler) CreateCustom(c *gin.Context) {
	var body struct {
		Title    string `json:"title" binding:"required"`
		Content  string `json:"content" binding:"required"`
		Audience string `json:"audience"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if body.Audience == "" {
		body.Audience = "ALL"
	}
	n, err := h.uc.CreateCustomNewsletter(c.Request.Context(), body.Title, body.Content, body.Audience)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, n)
}

func (h *NewsletterHandler) SendNewsletter(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	if err := h.uc.SendNewsletter(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Newsletter sent successfully"})
}

func (h *NewsletterHandler) Subscribe(c *gin.Context) {
	var req struct {
		GuardianID uuid.UUID `json:"guardian_id"`
		Email      string    `json:"email"`
		Frequency  string    `json:"frequency"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.uc.Subscribe(c.Request.Context(), req.GuardianID, req.Email, req.Frequency); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Subscribed"})
}

func (h *NewsletterHandler) Unsubscribe(c *gin.Context) {
	id, err := uuid.Parse(c.Param("guardian_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	if err := h.uc.Unsubscribe(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Unsubscribed"})
}
