package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/logger"
	"gorm.io/gorm"
)

type tenantKey string
type schemaKey string

const (
	TenantIDKey     tenantKey = "tenantID"
	TenantSchemaKey schemaKey = "tenantSchema"
	TenantNameKey   schemaKey = "tenantName"
)

func extractSubdomain(req *http.Request) string {
	host := req.Host
	subdomain := ""

	parts := strings.Split(host, ".")
	if len(parts) >= 2 {
		subdomain = parts[0]
		// Handle 'localhost:8080' vs 'tenant.localhost:8080'
		if strings.Contains(subdomain, ":") {
			subdomain = ""
		}
	}
	return subdomain
}

// TenantMiddleware extracts the subdomain from the request Host,
// queries the database for the corresponding tenant,
// and injects the TenantID and SchemaName into the context.
func TenantMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		subdomain := extractSubdomain(c.Request)

		// 1. Try X-Tenant-Subdomain header (Developer convenience/resilience)
		if sub := c.GetHeader("X-Tenant-Subdomain"); sub != "" {
			var t domain.Tenant
			if err := db.Where("subdomain = ?", sub).First(&t).Error; err == nil {
				if !t.IsActive {
					c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "This tenant account has been suspended"})
					return
				}
				injectContext(c, t)
				c.Next()
				return
			}
		}

		// 2. Fallback for explicit tenant ID header (optional)
		if tenantStr := c.GetHeader("X-Tenant-ID"); tenantStr != "" {
			if parsedUUID, err := uuid.Parse(tenantStr); err == nil {
				var t domain.Tenant
				if err := db.Where("id = ?", parsedUUID).First(&t).Error; err == nil {
					if !t.IsActive {
						c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "This tenant account has been suspended"})
						return
					}
					injectContext(c, t)
					c.Next()
					return
				}
			}
			c.AbortWithStatusJSON(403, gin.H{"error": "invalid tenant ID"})
			return
		}

		// 3. Fallback for query parameter (useful for WebSockets)
		if tenantQuery := c.Query("tenant"); tenantQuery != "" {
			var t domain.Tenant
			if err := db.Where("subdomain = ?", tenantQuery).First(&t).Error; err == nil {
				if !t.IsActive {
					c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "This tenant account has been suspended"})
					return
				}
				injectContext(c, t)
				c.Next()
				return
			}
		}

		host := c.Request.Host
		subdomain = extractSubdomain(c.Request)

		// 1. First, check if there's a custom domain mapped to the exact Host
		var t domain.Tenant
		err := db.Where("custom_domain = ?", host).First(&t).Error

		// 2. If no custom domain matches, fallback to subdomain matching
		if err != nil && subdomain != "" && subdomain != "www" && subdomain != "localhost" && subdomain != "127" {
			err = db.Where("subdomain = ?", subdomain).First(&t).Error
		}

		if err == nil {
			if !t.IsActive {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "This tenant account has been suspended"})
				return
			}

			// Check Trial Expiration Lockout
			path := c.Request.URL.Path
			isBillingExempt := strings.HasPrefix(path, "/api/tenant/subscription") ||
				strings.HasPrefix(path, "/api/tenant/profile") ||
				strings.HasPrefix(path, "/api/tenant/payment-config") ||
				strings.HasPrefix(path, "/api/auth")

			if t.TrialEndsAt != nil && time.Now().After(*t.TrialEndsAt) && !isBillingExempt {
				c.AbortWithStatusJSON(http.StatusPaymentRequired, gin.H{"error": "TRIAL_EXPIRED", "message": "Your trial period has expired. Please upgrade to a paid plan."})
				return
			}

			// Check Billing Due Date Lockout
			if t.BillingDueDate != nil && time.Now().After(*t.BillingDueDate) && !isBillingExempt {
				c.AbortWithStatusJSON(http.StatusPaymentRequired, gin.H{"error": "BILLING_LOCKED", "message": "Your billing cycle is overdue. Please pay to restore access."})
				return
			}

			injectContext(c, t)
			c.Next()
			return
		}

		logger.Info("Tenant not found")
		c.AbortWithStatusJSON(403, gin.H{"error": "tenant context could not be resolved"})
	}
}

func injectContext(c *gin.Context, t domain.Tenant) {
	c.Set("tenantID", t.ID)
	c.Set("tenantSchema", t.SchemaName)
	c.Set("tenantSubdomain", t.Subdomain)
	c.Set("tenantName", t.Name)

	ctx := context.WithValue(c.Request.Context(), TenantIDKey, t.ID)
	ctx = context.WithValue(ctx, TenantSchemaKey, t.SchemaName)
	ctx = context.WithValue(ctx, TenantNameKey, t.Name)
	c.Request = c.Request.WithContext(ctx)
}

// GetTenantIDFromContext is a helper to securely retrieve the TenantID from a standard context.
func GetTenantIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	if ctx == nil {
		return uuid.Nil, false
	}
	val, ok := ctx.Value(TenantIDKey).(uuid.UUID)
	return val, ok
}

// GetTenantSchemaFromContext is a helper to securely retrieve the SchemaName from a standard context.
func GetTenantSchemaFromContext(ctx context.Context) (string, bool) {
	if ctx == nil {
		return "", false
	}
	val, ok := ctx.Value(TenantSchemaKey).(string)
	return val, ok
}

// GetTenantNameFromContext is a helper to securely retrieve the Tenant Name from a standard context.
func GetTenantNameFromContext(ctx context.Context) (string, bool) {
	if ctx == nil {
		return "", false
	}
	val, ok := ctx.Value(TenantNameKey).(string)
	if !ok {
		return "School Name Placeholder", false
	}
	return val, true
}
