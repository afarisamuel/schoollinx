package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/user/high-school-management/backend/config"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/pkg/utils"
)

type ContextKey string

const (
	UserClaimsKey ContextKey = "user_claims"
)

func ExtractToken(r *http.Request) string {
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		parts := strings.Split(authHeader, " ")
		if len(parts) == 2 && parts[0] == "Bearer" {
			return parts[1]
		}
	}
	return r.URL.Query().Get("token")
}

func AuthMiddleware(cfg *config.Config, blacklistRepo domain.TokenBlacklistRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenString string

		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				tokenString = parts[1]
			}
		}

		if tokenString == "" {
			tokenString = c.Query("token")
		}

		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization token is required"})
			c.Abort()
			return
		}

		claims, err := utils.ValidateToken(tokenString, cfg)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}

		// Deny access if this is a 2FA pending token, except for the 2fa verification endpoint.
		if claims.TwoFactorPending {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "2FA verification required", "requires_2fa": true})
			return
		}

		// Check if token is revoked
		if claims.ID != "" && blacklistRepo != nil {
			isRevoked, _ := blacklistRepo.IsRevoked(c.Request.Context(), claims.ID)
			if isRevoked {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Token has been revoked"})
				c.Abort()
				return
			}
		}

		c.Set("userID", claims.UserID)
		c.Set("userRole", claims.Role)
		c.Set("permissions", claims.Permissions)
		c.Set("jti", claims.ID)
		c.Set(string(UserClaimsKey), claims)
		if claims.ExpiresAt != nil {
			c.Set("exp", claims.ExpiresAt.Time)
		}
		c.Next()
	}
}

// RoleMiddleware checks if the user has one of the allowed roles (legacy).
func RoleMiddleware(allowedRoles ...domain.Role) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("userRole")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "User role not found in context"})
			c.Abort()
			return
		}

		userRole := role.(domain.Role)
		isAllowed := false
		for _, r := range allowedRoles {
			if userRole == r {
				isAllowed = true
				break
			}
		}

		if !isAllowed {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied: insufficient permissions"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// PermissionMiddleware checks if the authenticated user has ALL of the required permissions.
// Permissions are embedded in the JWT token and injected into gin context by AuthMiddleware.
func PermissionMiddleware(requiredPermissions ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		permsVal, exists := c.Get("permissions")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "No permissions found in token"})
			c.Abort()
			return
		}

		userPermissions, ok := permsVal.([]string)
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{"error": "Invalid permissions format"})
			c.Abort()
			return
		}

		// Build a lookup set for O(1) checks
		permSet := make(map[string]struct{}, len(userPermissions))
		for _, p := range userPermissions {
			permSet[p] = struct{}{}
		}

		for _, req := range requiredPermissions {
			if _, found := permSet[req]; !found {
				c.JSON(http.StatusForbidden, gin.H{
					"error":               "Access denied: missing permission",
					"required_permission": req,
				})
				c.Abort()
				return
			}
		}

		c.Next()
	}
}
