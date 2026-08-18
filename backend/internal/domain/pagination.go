package domain

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

// PaginationQuery represents the pagination parameters sent by the client
type PaginationQuery struct {
	Page  int `json:"page"`
	Limit int `json:"limit"`
}

// GetOffset calculates the database offset based on page and limit
func (q *PaginationQuery) GetOffset() int {
	if q.Page <= 0 {
		q.Page = 1
	}
	if q.Limit <= 0 {
		q.Limit = 50 // default limit
	}
	if q.Limit > 1000 {
		q.Limit = 1000 // max limit
	}
	return (q.Page - 1) * q.Limit
}

// ParsePagination extracts pagination parameters from a gin context query
func ParsePagination(c *gin.Context) PaginationQuery {
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))

	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 50
	}

	return PaginationQuery{
		Page:  page,
		Limit: limit,
	}
}

// PaginationMeta represents the metadata returned in a paginated response
type PaginationMeta struct {
	CurrentPage int   `json:"current_page"`
	PageSize    int   `json:"page_size"`
	TotalCount  int64 `json:"total_count"`
	TotalPages  int   `json:"total_pages"`
}

// PaginatedResponse is the standard envelope for paginated endpoints
type PaginatedResponse struct {
	Data interface{}    `json:"data"`
	Meta PaginationMeta `json:"meta"`
}

// NewPaginatedResponse creates a standard response envelope
func NewPaginatedResponse(data interface{}, totalCount int64, query PaginationQuery) PaginatedResponse {
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.Limit <= 0 {
		query.Limit = 50
	}

	totalPages := int(totalCount) / query.Limit
	if int(totalCount)%query.Limit > 0 {
		totalPages++
	}

	return PaginatedResponse{
		Data: data,
		Meta: PaginationMeta{
			CurrentPage: query.Page,
			PageSize:    query.Limit,
			TotalCount:  totalCount,
			TotalPages:  totalPages,
		},
	}
}
