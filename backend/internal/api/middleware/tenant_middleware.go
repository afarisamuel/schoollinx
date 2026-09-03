package middleware

import (
	"context"
	"net"
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

func ExtractSubdomain(req *http.Request) string {
	host := req.Host
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}

	// Check if host is an IP address
	if net.ParseIP(host) != nil {
		return ""
	}

	// Handle localhost (e.g. "tenant2.localhost" or "localhost")
	if strings.HasSuffix(host, "localhost") {
		parts := strings.Split(host, ".")
		if len(parts) >= 2 && parts[0] != "localhost" && parts[0] != "" {
			return parts[0]
		}
		return ""
	}

	parts := strings.Split(host, ".")
	// e.g. "tenant1.basic-sms.com" -> len 3 -> "tenant1"
	if len(parts) >= 3 {
		return parts[0]
	}

	return ""
}

// TenantMiddleware extracts the subdomain from the request Host,
// queries the database for the corresponding tenant,
// and injects the TenantID and SchemaName into the context.
func TenantMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		subdomain := ExtractSubdomain(c.Request)

		// 1. Try X-Tenant-Subdomain header (Developer convenience/resilience)
		if sub := c.GetHeader("X-Tenant-Subdomain"); sub != "" {
			var t domain.Tenant
			if err := db.Table("public.tenants").Where("subdomain = ?", sub).First(&t).Error; err == nil {
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
				if err := db.Table("public.tenants").Where("id = ?", parsedUUID).First(&t).Error; err == nil {
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
			if err := db.Table("public.tenants").Where("subdomain = ?", tenantQuery).First(&t).Error; err == nil {
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
		subdomain = ExtractSubdomain(c.Request)

		// 1. First, check if there's a custom domain mapped to the exact Host
		var t domain.Tenant
		err := db.Table("public.tenants").Where("custom_domain = ?", host).First(&t).Error

		// 2. If no custom domain matches, fallback to subdomain matching
		if err != nil && subdomain != "" && subdomain != "www" && subdomain != "localhost" && subdomain != "127" {
			err = db.Table("public.tenants").Where("subdomain = ?", subdomain).First(&t).Error
		}

		// 3. Fallback for localhost development: default to first active tenant
		if err != nil && (strings.HasPrefix(host, "localhost") || strings.HasPrefix(host, "127.0.0.1")) {
			err = db.Table("public.tenants").Where("is_active = true").First(&t).Error
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
