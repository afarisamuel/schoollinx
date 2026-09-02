package handler

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/user/high-school-management/backend/config"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type SystemHandler struct {
	db  *gorm.DB
	cfg *config.Config
}

type GlobalUser struct {
	ID           string      `json:"id"`
	Name         string      `json:"name"`
	Email        string      `json:"email"`
	Role         domain.Role `json:"role"`
	Organization string      `json:"organization"`
	Subdomain    string      `json:"subdomain"`
	Status       string      `json:"status"`
	CreatedAt    string      `json:"created_at"`
}

func NewSystemHandler(r *gin.RouterGroup, db *gorm.DB, cfg *config.Config) {
	h := &SystemHandler{db: db, cfg: cfg}
	r.GET("/stats", h.GetStats)
	r.GET("/directory", h.GetGlobalDirectory)
	
	// Announcements
	r.GET("/announcements", h.ListAnnouncements)
	r.POST("/announcements", h.CreateAnnouncement)
	r.PATCH("/announcements/:id/toggle", h.ToggleAnnouncement)
	r.PUT("/announcements/:id", h.UpdateAnnouncement)
	r.DELETE("/announcements/:id", h.DeleteAnnouncement)

	// Phase 5: Health & Configs
	r.GET("/health", h.GetHealthStatus)
	r.GET("/configs", h.ListConfigs)
	r.PATCH("/configs/:key", h.UpdateConfig)
	
	// Phase 5: Support Tickets
	r.GET("/tickets", h.ListTickets)
	r.PATCH("/tickets/:id", h.ResolveTicket)

	// Contact Form Submissions
	r.GET("/contacts", h.ListContactSubmissions)
	r.PATCH("/contacts/:id/status", h.UpdateContactSubmissionStatus)

	// Security IP Whitelist
	r.GET("/security/ips", h.ListSecurityIPs)
	r.POST("/security/ips", h.AddSecurityIP)
	r.DELETE("/security/ips/:id", h.DeleteSecurityIP)
}

func (h *SystemHandler) GetStats(c *gin.Context) {
	var totalTenants int64
	var totalUsers int64

	h.db.Model(&domain.Tenant{}).Count(&totalTenants)

	// Aggregate user counts from every isolated schema
	var tenants []domain.Tenant
	if err := h.db.Find(&tenants).Error; err == nil {
		for _, tenant := range tenants {
			var count int64
			if tenant.SchemaName != "" && tenant.SchemaName != "public" {
				h.db.Table(tenant.SchemaName + ".users").Count(&count)
				totalUsers += count
			}
		}
	}

	// Add global system admins from public schema
	var publicAdmins int64
	h.db.Table("public.users").Count(&publicAdmins)
	totalUsers += publicAdmins

	c.JSON(http.StatusOK, gin.H{
		"totalTenants":   totalTenants,
		"totalUsers":     totalUsers,
		"activeSessions": 2,
		"systemHealth":   "Optimal",
	})
}

func (h *SystemHandler) GetGlobalDirectory(c *gin.Context) {
	var tenants []domain.Tenant
	if err := h.db.Find(&tenants).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve organizations"})
		return
	}

	var globalDirectory []GlobalUser

	for _, tenant := range tenants {
		schemaName := tenant.SchemaName
		if schemaName == "" || schemaName == "public" {
			continue
		}

		// Create a local session for this tenant
		var users []domain.User
		// We use Table() with schema prefix to avoid search_path pollution inside the loop
		if err := h.db.Table(schemaName + ".users").Find(&users).Error; err == nil {
			for _, u := range users {
				name := "Internal Account"

				// Attempt to resolve name from profile tables if applicable
				switch u.Role {
				case domain.RoleStudent:
					var s domain.Student
					if err := h.db.Table(schemaName+".students").Where("user_id = ?", u.ID).First(&s).Error; err == nil {
						// Note: s.FirstName and s.LastName are EncryptedString, GORM Scan() handles decryption
						name = fmt.Sprintf("%s %s", string(s.FirstName), string(s.LastName))
					}
				case domain.RoleTeacher:
					var t domain.Teacher
					if err := h.db.Table(schemaName+".teachers").Where("user_id = ?", u.ID).First(&t).Error; err == nil {
						name = fmt.Sprintf("%s %s", string(t.FirstName), string(t.LastName))
					}
				}

				globalDirectory = append(globalDirectory, GlobalUser{
					ID:           u.ID.String(),
					Name:         name,
					Email:        string(u.Email), // DeterministicEncryptedString auto-decrypts on Scan
					Role:         u.Role,
					Organization: tenant.Name,
					Subdomain:    tenant.Subdomain,
					Status:       "Active", // Default for now
					CreatedAt:    u.CreatedAt.Format("2006-01-02"),
				})
			}
		}
	}

	c.JSON(http.StatusOK, globalDirectory)
}

func (h *SystemHandler) ListAnnouncements(c *gin.Context) {
	var announcements []domain.SystemAnnouncement
	if err := h.db.Table("public.system_announcements").Order("created_at desc").Find(&announcements).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch announcements"})
		return
	}
	c.JSON(http.StatusOK, announcements)
}

func (h *SystemHandler) CreateAnnouncement(c *gin.Context) {
	var req struct {
		Title    string `json:"title" binding:"required"`
		Content  string `json:"content" binding:"required"`
		Priority string `json:"priority"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	if req.Priority == "" {
		req.Priority = "INFO"
	}
	announcement := domain.SystemAnnouncement{
		Title:    req.Title,
		Content:  req.Content,
		Priority: req.Priority,
		IsActive: true,
	}
	if err := h.db.Table("public.system_announcements").Create(&announcement).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create announcement"})
		return
	}
	c.JSON(http.StatusCreated, announcement)
}

func (h *SystemHandler) ToggleAnnouncement(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		IsActive bool `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	if err := h.db.Table("public.system_announcements").Where("id = ?", id).Update("is_active", req.IsActive).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update announcement"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Announcement toggled successfully"})
}

func (h *SystemHandler) DeleteAnnouncement(c *gin.Context) {
	id := c.Param("id")
	if err := h.db.Table("public.system_announcements").Where("id = ?", id).Delete(&domain.SystemAnnouncement{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete announcement"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Announcement deleted successfully"})
}

func (h *SystemHandler) UpdateAnnouncement(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Title    string `json:"title" binding:"required"`
		Content  string `json:"content" binding:"required"`
		Priority string `json:"priority" binding:"required,oneof=INFO WARNING CRITICAL"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	if err := h.db.Table("public.system_announcements").Where("id = ?", id).Updates(map[string]interface{}{
		"title": req.Title,
		"content": req.Content,
		"priority": req.Priority,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update announcement"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Announcement updated successfully"})
}

func (h *SystemHandler) GetHealthStatus(c *gin.Context) {
	// Ping DB
	dbStatus := "Operational"
	sqlDB, err := h.db.DB()
	if err != nil || sqlDB.Ping() != nil {
		dbStatus = "Degraded"
	}

	// Check Paystack gateway reachability
	paystackStatus := "Unconfigured"
	if h.cfg != nil && h.cfg.PaystackSecretKey != "" {
		client := &http.Client{Timeout: 4 * time.Second}
		resp, err := client.Get("https://api.paystack.co")
		if err != nil {
			paystackStatus = "Degraded"
		} else {
			resp.Body.Close()
			if resp.StatusCode < 500 {
				paystackStatus = "Operational"
			} else {
				paystackStatus = "Degraded"
			}
		}
	}

	// Check Arkasel/SMS gateway reachability
	smsStatus := "Unconfigured"
	if h.cfg != nil && h.cfg.SMSAPIKey != "" {
		client := &http.Client{Timeout: 4 * time.Second}
		resp, err := client.Get("https://sms.arkesel.com")
		if err != nil {
			smsStatus = "Degraded"
		} else {
			resp.Body.Close()
			if resp.StatusCode < 500 {
				smsStatus = "Operational"
			} else {
				smsStatus = "Degraded"
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"database": dbStatus,
		"paystack": paystackStatus,
		"sms_gateway": smsStatus,
		"aws_s3":   "Operational",
	})
}

func (h *SystemHandler) ListConfigs(c *gin.Context) {
	var configs []domain.SystemConfig
	if err := h.db.Find(&configs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch configs"})
		return
	}
	c.JSON(http.StatusOK, configs)
}

func (h *SystemHandler) UpdateConfig(c *gin.Context) {
	key := c.Param("key")
	var req struct {
		Value string `json:"value"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.db.Model(&domain.SystemConfig{}).Where("key = ?", key).Update("value", req.Value).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update config"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "Config updated"})
}

func (h *SystemHandler) ListTickets(c *gin.Context) {
	var tickets []domain.SupportTicket
	if err := h.db.Preload("Tenant").Order("created_at desc").Find(&tickets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tickets"})
		return
	}
	c.JSON(http.StatusOK, tickets)
}

func (h *SystemHandler) ResolveTicket(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.db.Model(&domain.SupportTicket{}).Where("id = ?", id).Update("status", req.Status).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to resolve ticket"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "Ticket resolved"})
}

func (h *SystemHandler) ListContactSubmissions(c *gin.Context) {
	var submissions []domain.ContactSubmission
	query := h.db.Table("public.contact_submissions").Order("created_at desc")
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}
	if err := query.Find(&submissions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch contact submissions"})
		return
	}
	c.JSON(http.StatusOK, submissions)
}

func (h *SystemHandler) UpdateContactSubmissionStatus(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.db.Table("public.contact_submissions").Where("id = ?", id).Update("status", req.Status).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update submission status"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Status updated"})
}

func (h *SystemHandler) ListSecurityIPs(c *gin.Context) {
	var ips []domain.SystemSecurityIP
	if err := h.db.Table("public.system_security_ips").Order("created_at desc").Find(&ips).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch IPs"})
		return
	}
	c.JSON(http.StatusOK, ips)
}

func (h *SystemHandler) AddSecurityIP(c *gin.Context) {
	var req struct {
		IPAddress   string `json:"ip_address" binding:"required"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Assuming the admin email is fetched from Context in real scenario, fallback here
	adminEmail, _ := c.Get("user_email")
	emailStr := "admin@system.local"
	if email, ok := adminEmail.(string); ok && email != "" {
		emailStr = email
	}

	ip := domain.SystemSecurityIP{
		IPAddress:   req.IPAddress,
		Description: req.Description,
		AddedBy:     emailStr,
	}

	if err := h.db.Table("public.system_security_ips").Create(&ip).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add IP (might already exist)"})
		return
	}
	c.JSON(http.StatusCreated, ip)
}

func (h *SystemHandler) DeleteSecurityIP(c *gin.Context) {
	id := c.Param("id")
	if err := h.db.Table("public.system_security_ips").Where("id = ?", id).Delete(&domain.SystemSecurityIP{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove IP"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "IP removed"})
}
