package handler

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type LegalPageHandler struct {
	db *gorm.DB
}

func NewLegalPageHandler(systemGroup *gin.RouterGroup, publicGroup *gin.RouterGroup, db *gorm.DB) *LegalPageHandler {
	h := &LegalPageHandler{db: db}

	if systemGroup != nil {
		g := systemGroup.Group("/legal-pages")
		{
			g.GET("", h.AdminListLegalPages)
			g.GET("/:id", h.AdminGetLegalPage)
			g.POST("", h.AdminCreateLegalPage)
			g.PUT("/:id", h.AdminUpdateLegalPage)
			g.PATCH("/:id/toggle", h.AdminTogglePublish)
			g.DELETE("/:id", h.AdminDeleteLegalPage)
		}
	}

	if publicGroup != nil {
		g := publicGroup.Group("/legal-pages")
		{
			g.GET("", h.PublicListLegalPages)
			g.GET("/:slug", h.PublicGetLegalPage)
		}
	}

	return h
}

type LegalPageUpsertReq struct {
	Slug          string     `json:"slug" binding:"required"`
	Title         string     `json:"title" binding:"required"`
	Category      string     `json:"category"`
	Summary       string     `json:"summary"`
	Content       string     `json:"content" binding:"required"`
	Version       string     `json:"version"`
	IsPublished   *bool      `json:"is_published"`
	EffectiveDate *time.Time `json:"effective_date"`
	LastUpdatedBy string     `json:"last_updated_by"`
}

// AdminListLegalPages returns all legal pages for super admin dashboard
func (h *LegalPageHandler) AdminListLegalPages(c *gin.Context) {
	var pages []domain.LegalPage
	query := h.db.Model(&domain.LegalPage{}).Order("category asc, title asc")

	if cat := strings.TrimSpace(c.Query("category")); cat != "" {
		query = query.Where("category = ?", cat)
	}
	if q := strings.TrimSpace(c.Query("q")); q != "" {
		query = query.Where("title ILIKE ? OR slug ILIKE ? OR summary ILIKE ?", "%"+q+"%", "%"+q+"%", "%"+q+"%")
	}

	if err := query.Find(&pages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch legal pages"})
		return
	}

	c.JSON(http.StatusOK, pages)
}

// AdminGetLegalPage returns a specific legal page by ID or slug
func (h *LegalPageHandler) AdminGetLegalPage(c *gin.Context) {
	idParam := c.Param("id")
	var page domain.LegalPage

	parsedUUID, err := uuid.Parse(idParam)
	if err == nil {
		err = h.db.First(&page, "id = ?", parsedUUID).Error
	} else {
		err = h.db.First(&page, "slug = ?", idParam).Error
	}

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Legal page not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve legal page"})
		return
	}

	c.JSON(http.StatusOK, page)
}

// AdminCreateLegalPage creates a new legal page
func (h *LegalPageHandler) AdminCreateLegalPage(c *gin.Context) {
	var req LegalPageUpsertReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload: " + err.Error()})
		return
	}

	slug := strings.ToLower(strings.TrimSpace(req.Slug))
	slug = strings.ReplaceAll(slug, " ", "-")

	var existing domain.LegalPage
	if err := h.db.Unscoped().Where("slug = ?", slug).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "A legal page with this slug already exists"})
		return
	}

	now := time.Now()
	effective := req.EffectiveDate
	if effective == nil {
		effective = &now
	}

	isPublished := true
	if req.IsPublished != nil {
		isPublished = *req.IsPublished
	}

	category := req.Category
	if category == "" {
		category = "General"
	}

	version := req.Version
	if version == "" {
		version = "1.0"
	}

	page := domain.LegalPage{
		ID:            uuid.New(),
		Slug:          slug,
		Title:         req.Title,
		Category:      category,
		Summary:       req.Summary,
		Content:       req.Content,
		Version:       version,
		IsPublished:   isPublished,
		EffectiveDate: effective,
		LastUpdatedBy: req.LastUpdatedBy,
	}

	if err := h.db.Create(&page).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create legal page: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, page)
}

// AdminUpdateLegalPage updates an existing legal page
func (h *LegalPageHandler) AdminUpdateLegalPage(c *gin.Context) {
	idParam := c.Param("id")
	var page domain.LegalPage

	parsedUUID, err := uuid.Parse(idParam)
	if err == nil {
		err = h.db.First(&page, "id = ?", parsedUUID).Error
	} else {
		err = h.db.First(&page, "slug = ?", idParam).Error
	}

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Legal page not found"})
		return
	}

	var req LegalPageUpsertReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload: " + err.Error()})
		return
	}

	if req.Slug != "" {
		slug := strings.ToLower(strings.TrimSpace(req.Slug))
		slug = strings.ReplaceAll(slug, " ", "-")
		if slug != page.Slug {
			var existing domain.LegalPage
			if err := h.db.Where("slug = ? AND id != ?", slug, page.ID).First(&existing).Error; err == nil {
				c.JSON(http.StatusConflict, gin.H{"error": "Slug is already used by another legal page"})
				return
			}
			page.Slug = slug
		}
	}

	if req.Title != "" {
		page.Title = req.Title
	}
	if req.Category != "" {
		page.Category = req.Category
	}
	page.Summary = req.Summary
	page.Content = req.Content
	if req.Version != "" {
		page.Version = req.Version
	}
	if req.IsPublished != nil {
		page.IsPublished = *req.IsPublished
	}
	if req.EffectiveDate != nil {
		page.EffectiveDate = req.EffectiveDate
	}
	if req.LastUpdatedBy != "" {
		page.LastUpdatedBy = req.LastUpdatedBy
	}

	if err := h.db.Save(&page).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update legal page"})
		return
	}

	c.JSON(http.StatusOK, page)
}

// AdminTogglePublish toggles publish status
func (h *LegalPageHandler) AdminTogglePublish(c *gin.Context) {
	idParam := c.Param("id")
	var page domain.LegalPage

	parsedUUID, err := uuid.Parse(idParam)
	if err == nil {
		err = h.db.First(&page, "id = ?", parsedUUID).Error
	} else {
		err = h.db.First(&page, "slug = ?", idParam).Error
	}

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Legal page not found"})
		return
	}

	page.IsPublished = !page.IsPublished
	if err := h.db.Model(&page).Update("is_published", page.IsPublished).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to toggle status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"id": page.ID, "is_published": page.IsPublished})
}

// AdminDeleteLegalPage deletes a legal page
func (h *LegalPageHandler) AdminDeleteLegalPage(c *gin.Context) {
	idParam := c.Param("id")
	var page domain.LegalPage

	parsedUUID, err := uuid.Parse(idParam)
	if err == nil {
		err = h.db.First(&page, "id = ?", parsedUUID).Error
	} else {
		err = h.db.First(&page, "slug = ?", idParam).Error
	}

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Legal page not found"})
		return
	}

	if err := h.db.Delete(&page).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete legal page"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Legal page deleted successfully"})
}

// PublicListLegalPages lists all active published legal pages
func (h *LegalPageHandler) PublicListLegalPages(c *gin.Context) {
	type PublicLegalPageSummary struct {
		ID            uuid.UUID  `json:"id"`
		Slug          string     `json:"slug"`
		Title         string     `json:"title"`
		Category      string     `json:"category"`
		Summary       string     `json:"summary"`
		Version       string     `json:"version"`
		EffectiveDate *time.Time `json:"effective_date"`
		UpdatedAt     time.Time  `json:"updated_at"`
	}

	var pages []PublicLegalPageSummary
	err := h.db.Model(&domain.LegalPage{}).
		Select("id, slug, title, category, summary, version, effective_date, updated_at").
		Where("is_published = ?", true).
		Order("category asc, title asc").
		Find(&pages).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load legal pages"})
		return
	}

	c.JSON(http.StatusOK, pages)
}

// PublicGetLegalPage fetches a single published page by slug (with fallback alias mapping)
func (h *LegalPageHandler) PublicGetLegalPage(c *gin.Context) {
	rawSlug := strings.ToLower(strings.TrimSpace(c.Param("slug")))

	// Normalize common alias slugs
	slug := rawSlug
	switch rawSlug {
	case "privacy", "gdpr", "dpa":
		slug = "privacy-policy"
	case "terms", "tos", "agreement":
		slug = "terms-of-service"
	case "cookies", "cookie":
		slug = "cookie-policy"
	case "security", "whitepaper", "compliance":
		slug = "security-whitepaper"
	case "acceptable-use-policy", "aup":
		slug = "acceptable-use"
	}

	var page domain.LegalPage
	err := h.db.Where("(slug = ? OR slug = ?) AND is_published = ?", slug, rawSlug, true).First(&page).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Legal policy not found or not published"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load policy"})
		return
	}

	c.JSON(http.StatusOK, page)
}
