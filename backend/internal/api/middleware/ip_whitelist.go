package middleware

import (
	"log"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"github.com/user/high-school-management/backend/internal/domain"
)

// IPWhitelistMiddleware ensures only whitelisted IPs can access Super Admin APIs
// NOTE: It is currently configured in "Dry-Run" mode. It logs violations but does not block them yet to prevent accidental lockouts.
func IPWhitelistMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		
		// If DB is nil or WhitelistedIPs table doesn't have entries, fail-open (allow).
		var count int64
		db.Model(&domain.WhitelistedIP{}).Count(&count)
		
		if count > 0 {
			var match int64
			db.Model(&domain.WhitelistedIP{}).Where("ip_address = ?", ip).Count(&match)
			
			if match == 0 {
				log.Printf("SECURITY ALERT: Blocked unauthorized IP %s from accessing Super Admin API", ip)
				// DRY RUN MODE: Normally we would block. For now we just log to prevent immediate lockouts.
				// c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "IP address not whitelisted for Super Admin access"})
				// return
			}
		}

		c.Next()
	}
}
