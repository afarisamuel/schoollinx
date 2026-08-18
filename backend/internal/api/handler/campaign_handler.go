package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/usecase"
)

type CampaignHandler struct {
	manager usecase.CampaignManager
}

func NewCampaignHandler(rg *gin.RouterGroup, manager usecase.CampaignManager) {
	h := &CampaignHandler{manager: manager}

	campaigns := rg.Group("/campaigns")
	campaigns.GET("", h.ListCampaigns)
	campaigns.POST("", h.CreateCampaign)
	campaigns.GET("/:id", h.GetCampaign)
	campaigns.DELETE("/:id", h.DeleteCampaign)
	campaigns.POST("/:id/dispatch", h.DispatchCampaign)
}

func (h *CampaignHandler) ListCampaigns(c *gin.Context) {
	campaigns, err := h.manager.GetAll(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, campaigns)
}

func (h *CampaignHandler) GetCampaign(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid campaign ID format"})
		return
	}
	campaign, err := h.manager.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "campaign not found"})
		return
	}
	c.JSON(http.StatusOK, campaign)
}

func (h *CampaignHandler) CreateCampaign(c *gin.Context) {
	var campaign domain.Campaign
	if err := c.ShouldBindJSON(&campaign); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Tag the creator from the JWT-populated context
	if creatorID, exists := c.Get("userID"); exists {
		if uid, ok := creatorID.(uuid.UUID); ok {
			campaign.CreatorID = uid
		}
	}

	if err := h.manager.DraftCampaign(c.Request.Context(), &campaign); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, campaign)
}

func (h *CampaignHandler) DeleteCampaign(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid campaign ID format"})
		return
	}
	if err := h.manager.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "campaign deleted"})
}

// DispatchCampaign triggers the async background email worker
func (h *CampaignHandler) DispatchCampaign(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid campaign ID format"})
		return
	}
	if err := h.manager.DispatchCampaign(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusAccepted, gin.H{
		"message": "Campaign dispatch initiated. Emails are being processed in the background.",
	})
}
