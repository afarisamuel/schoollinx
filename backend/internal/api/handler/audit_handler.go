package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/user/high-school-management/backend/internal/domain"
)

type AuditHandler struct {
	auditUseCase domain.AuditUseCase
}

func NewAuditHandler(r *gin.RouterGroup, uc domain.AuditUseCase) {
	h := &AuditHandler{auditUseCase: uc}
	r.GET("/audit-logs", h.GetLogs)
}

func (h *AuditHandler) GetLogs(c *gin.Context) {
	pagination := domain.ParsePagination(c)

	logs, total, err := h.auditUseCase.GetAllLogsPaginated(c.Request.Context(), pagination)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, domain.NewPaginatedResponse(logs, total, pagination))
}
