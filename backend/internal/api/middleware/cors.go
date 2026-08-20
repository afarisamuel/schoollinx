package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

func CORSMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		allowedOrigins := []string{
			"http://localhost:4200",
			"http://localhost:6222",
			"https://admin.schoollinx.com",
			"https://hq.schoollinx.com",
			"https://schoollinx.com",
			"https://*.schoollinx.com",
		}

		isAllowed := false
		for _, o := range allowedOrigins {
			if origin == o {
				isAllowed = true
				break
			}
		}

		if !isAllowed && strings.HasPrefix(origin, "http://localhost:") {
			isAllowed = true
		}

		// Strictly verify .schoollinx.com subdomains against the database (Gap #11)
		if !isAllowed && strings.HasSuffix(origin, ".schoollinx.com") && origin != "https://schoollinx.com" {
			// Extract subdomain (e.g., https://tenant1.schoollinx.com -> tenant1)
			parts := strings.Split(origin, "://")
			if len(parts) == 2 {
				host := parts[1]
				subdomain := strings.TrimSuffix(host, ".schoollinx.com")

				// Verify if subdomain exists and is active
				var t domain.Tenant
				if err := db.Where("subdomain = ? AND is_active = ?", subdomain, true).First(&t).Error; err == nil {
					isAllowed = true
				}
			}
		} else if !isAllowed && origin == "https://schoollinx.com" {
			isAllowed = true
		}

		// Allow *.localhost origins for local subdomain development
		// e.g. http://thinkce.localhost:4200
		if !isAllowed && strings.Contains(origin, ".localhost") {
			isAllowed = true
		}

		if isAllowed {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		}

		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, X-Tenant-Slug, X-App-ID, X-Tenant-Subdomain")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
