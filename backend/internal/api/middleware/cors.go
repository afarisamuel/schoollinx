package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
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
			"https://www.schoollinx.com",
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

		// Allow any .schoollinx.com origin (including multi-tenant subdomains like kwame.schoollinx.com)
		if !isAllowed && (strings.HasSuffix(origin, ".schoollinx.com") || origin == "https://schoollinx.com" || origin == "http://schoollinx.com") {
			isAllowed = true
		}

		// Allow *.localhost origins for local subdomain development
		// e.g. http://thinkce.localhost:4200
		if !isAllowed && strings.Contains(origin, ".localhost") {
			isAllowed = true
		}

		if isAllowed && origin != "" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		} else if origin == "" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		}

		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")

		// Comprehensive allowed headers list including frontend custom control headers
		allowedHeaders := "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, X-Tenant-Slug, X-App-ID, X-Tenant-Subdomain, X-Tenant-ID, X-Skip-Toast-Error, x-skip-toast-error, skip-toast, X-Impersonate-Tenant, X-Device-ID, X-App-Version, X-Client-Platform, Upgrade, Connection"
		if reqHeaders := c.Request.Header.Get("Access-Control-Request-Headers"); reqHeaders != "" {
			allowedHeaders = allowedHeaders + ", " + reqHeaders
		}
		c.Writer.Header().Set("Access-Control-Allow-Headers", allowedHeaders)
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		// Security Headers (Gap #96)
		c.Writer.Header().Set("X-Content-Type-Options", "nosniff")
		c.Writer.Header().Set("X-Frame-Options", "SAMEORIGIN")
		c.Writer.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Writer.Header().Set("X-XSS-Protection", "1; mode=block")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
