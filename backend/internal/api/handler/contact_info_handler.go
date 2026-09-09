package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type ContactInfoHandler struct {
	db *gorm.DB
}

func NewContactInfoHandler(systemGroup *gin.RouterGroup, publicGroup *gin.RouterGroup, db *gorm.DB) *ContactInfoHandler {
	h := &ContactInfoHandler{db: db}

	if systemGroup != nil {
		g := systemGroup.Group("/contact-info")
		{
			g.GET("", h.GetContactInfo)
			g.PUT("", h.UpdateContactInfo)
		}
	}

	if publicGroup != nil {
		g := publicGroup.Group("/contact-info")
		{
			g.GET("", h.GetContactInfo)
		}
	}

	return h
}

func (h *ContactInfoHandler) GetContactInfo(c *gin.Context) {
	var info domain.CompanyContactInfo
	if err := h.db.First(&info).Error; err != nil {
		// Fallback default
		info = domain.CompanyContactInfo{
			ID:                   1,
			SalesEmail:           "sales@schoollinx.com",
			SalesTitle:           "Institutional Sales",
			SalesDesc:            "Discuss school migration, pricing tiers & demos.",
			SupportEmail:         "support@schoollinx.com",
			SupportTitle:         "Technical Support Concierge",
			SupportDesc:          "Assistance for headmasters, ICT coordinators & bursars.",
			GeneralEmail:         "info@schoollinx.com",
			DpoEmail:             "privacy@schoollinx.com",
			PrimaryPhone:         "+233 24 412 3456",
			PhoneTitle:           "Direct Telephone & WhatsApp",
			OperatingHours:       "Monday to Friday, 8:00 AM – 5:00 PM GMT",
			WhatsAppNumber:       "+233244123456",
			EmergencyHotline:     "+233 20 000 1122",
			HeadquartersTitle:    "Regional Headquarters",
			HeadquartersSubtitle: "West Africa Technology Innovation Hub",
			HeadquartersAddress:  "Accra • Lagos • Nairobi",
			FullAddress:          "12 Independence Avenue, Ridge, Accra, Ghana",
			TwitterUrl:           "https://twitter.com",
			LinkedInUrl:          "https://linkedin.com",
			GitHubUrl:            "https://github.com",
			YouTubeUrl:           "https://youtube.com",
			FacebookUrl:          "https://facebook.com",
		}
	}

	c.JSON(http.StatusOK, info)
}

func (h *ContactInfoHandler) UpdateContactInfo(c *gin.Context) {
	var req domain.CompanyContactInfo
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload: " + err.Error()})
		return
	}

	var existing domain.CompanyContactInfo
	if err := h.db.First(&existing).Error; err != nil {
		req.ID = 1
		if err := h.db.Create(&req).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create contact info: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, req)
		return
	}

	req.ID = existing.ID
	if err := h.db.Save(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update contact info: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, req)
}
