package middleware

import (
	"bytes"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/pkg/utils"
)

func AuditMiddleware(auditUC domain.AuditUseCase) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Only audit write operations
		if c.Request.Method == http.MethodGet || c.Request.Method == http.MethodOptions || c.Request.Method == http.MethodHead {
			c.Next()
			return
		}

		// Save the request body for logging
		var body []byte
		if c.Request.Body != nil {
			body, _ = io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(body))
		}

		c.Next()

		// Logic after request (capture status and user)
		if c.Writer.Status() < 400 {
			userIDVal, exists := c.Get("userID")
			if !exists {
				return
			}

			userID, ok := userIDVal.(uuid.UUID)
			if !ok {
				return
			}

			// Extract email from the JWT claims stored by AuthMiddleware
			userEmail := ""
			if claimsVal, ok := c.Get(string(UserClaimsKey)); ok {
				if claims, ok := claimsVal.(*utils.Claims); ok {
					userEmail = claims.Email
				}
			}

			// Determine action
			action := domain.ActionCreate
			switch c.Request.Method {
			case http.MethodPut, http.MethodPatch:
				action = domain.ActionUpdate
			case http.MethodDelete:
				action = domain.ActionDelete
			}

			// Special case for bulk delete
			if strings.Contains(c.Request.URL.Path, "bulk-delete") {
				action = domain.ActionBulkDelete
			}

			// Determine entity type from path
			// Path format: /api/tenant/<entity>/...
			pathParts := strings.Split(strings.Trim(c.Request.URL.Path, "/"), "/")
			entityType := "UNKNOWN"
			// Skip "api" and "tenant" prefixes to get the resource name
			for i, part := range pathParts {
				if part == "tenant" && i+1 < len(pathParts) {
					entityType = strings.ToUpper(pathParts[i+1])
					break
				}
			}
			if entityType == "UNKNOWN" && len(pathParts) >= 2 {
				entityType = strings.ToUpper(pathParts[len(pathParts)-1])
			}

			auditUC.Log(c.Request.Context(), &domain.AuditLog{
				UserID:     userID,
				UserEmail:  userEmail,
				Action:     action,
				EntityType: entityType,
				EntityID:   c.Param("id"),
				Changes:    string(body),
				IPAddress:  c.ClientIP(),
			})
		}
	}
}
