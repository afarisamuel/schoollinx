package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/user/high-school-management/backend/internal/domain"
)

type SearchHandler struct {
	useCase domain.SearchUseCase
}

func NewSearchHandler(r *gin.RouterGroup, uc domain.SearchUseCase) {
	h := &SearchHandler{useCase: uc}
	r.GET("/search", h.GlobalSearch)
}

func (h *SearchHandler) GlobalSearch(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusOK, []domain.SearchResult{})
		return
	}

	results, err := h.useCase.Search(c.Request.Context(), query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, results)
}
