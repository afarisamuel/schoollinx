package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/user/high-school-management/backend/internal/usecase"
)

type PublicHandler struct {
	tenantUseCase usecase.TenantUseCase
}

func NewPublicHandler(r *gin.RouterGroup, tenantUseCase usecase.TenantUseCase) {
	h := &PublicHandler{tenantUseCase: tenantUseCase}

	g := r.Group("/tenants")
	{
		g.POST("/register", h.RegisterTenant)
		g.GET("/search", h.SearchTenants)
		g.GET("/list", h.ListTenants)
	}
}

type PublicTenantDTO struct {
	Name      string `json:"name"`
	Code      string `json:"code"`
	Subdomain string `json:"subdomain"`
	Domain    string `json:"domain"`
	LogoURL   string `json:"logo_url"`
}

func (h *PublicHandler) ListTenants(c *gin.Context) {
	tenants, err := h.tenantUseCase.ListTenants(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var results []PublicTenantDTO
	for _, t := range tenants {
		if t.IsActive {
			domainStr := t.Subdomain
			if t.CustomDomain != nil && *t.CustomDomain != "" {
				domainStr = *t.CustomDomain
			}
			results = append(results, PublicTenantDTO{
				Name:      t.Name,
				Code:      t.Subdomain,
				Subdomain: t.Subdomain,
				Domain:    domainStr,
				LogoURL:   t.LogoURL,
			})
		}
	}

	c.JSON(http.StatusOK, results)
}

func (h *PublicHandler) SearchTenants(c *gin.Context) {
	query := strings.ToLower(strings.TrimSpace(c.Query("q")))
	tenants, err := h.tenantUseCase.ListTenants(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var results []PublicTenantDTO
	for _, t := range tenants {
		if t.IsActive {
			domainStr := t.Subdomain
			if t.CustomDomain != nil && *t.CustomDomain != "" {
				domainStr = *t.CustomDomain
			}
			if query == "" ||
				strings.Contains(strings.ToLower(t.Name), query) ||
				strings.Contains(strings.ToLower(t.Subdomain), query) ||
				strings.Contains(strings.ToLower(domainStr), query) {
				results = append(results, PublicTenantDTO{
					Name:      t.Name,
					Code:      t.Subdomain,
					Subdomain: t.Subdomain,
					Domain:    domainStr,
					LogoURL:   t.LogoURL,
				})
			}
		}
	}

	c.JSON(http.StatusOK, results)
}

func (h *PublicHandler) RegisterTenant(c *gin.Context) {
	var req usecase.OnboardTenantReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	tenant, err := h.tenantUseCase.OnboardTenant(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Tenant registered successfully. Please check your email for the setup link.",
		"tenant":  tenant,
	})
}
