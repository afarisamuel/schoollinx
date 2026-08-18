package handler

import (
	"io"
	"mime"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
)

// Maximum upload size: 10MB
const maxUploadSize = 10 << 20

// Allowed MIME types for document uploads
var allowedMimeTypes = map[string]bool{
	"application/pdf":                                                         true,
	"application/msword":                                                      true,
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document":  true,
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":        true,
	"application/vnd.ms-excel":                                                true,
	"image/jpeg":                                                              true,
	"image/png":                                                               true,
	"image/gif":                                                               true,
	"text/plain":                                                              true,
	"text/csv":                                                                true,
}

type DocumentHandler struct {
	useCase domain.DocumentUseCase
}

func NewDocumentHandler(r *gin.RouterGroup, useCase domain.DocumentUseCase) {
	h := &DocumentHandler{useCase: useCase}

	g := r.Group("/documents")
	g.Use(middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleTeacher, domain.RoleStudent))
	{
		g.POST("/upload", h.Upload)
		g.GET("/owner/:owner_id", h.GetByOwner)
		g.GET("/:id/download", h.Download)
		g.DELETE("/:id", h.Delete)
	}
}

func (h *DocumentHandler) Upload(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// Enforce file size limit (Gap #9)
	if file.Size > maxUploadSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File size exceeds 10MB limit"})
		return
	}

	// Validate MIME type (Gap #9)
	mimeType := file.Header.Get("Content-Type")
	if !allowedMimeTypes[mimeType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File type not allowed. Accepted: PDF, Word, Excel, images, CSV, and text files."})
		return
	}

	// Sanitize filename to prevent path traversal (Gap #9)
	sanitizedName := filepath.Base(file.Filename)
	if strings.Contains(sanitizedName, "..") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid filename"})
		return
	}

	ownerID, err := uuid.Parse(c.PostForm("owner_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid owner ID"})
		return
	}

	doc := &domain.Document{
		OwnerID:      ownerID,
		OwnerType:    c.PostForm("owner_type"),
		Category:     domain.DocumentCategory(c.PostForm("category")),
		Title:        sanitizedName,
		Description:  c.PostForm("description"),
		FileMimeType: mimeType,
		UploadedBy:   uuid.Nil, // In reality, extract from JWT
	}

	// Read file contents (using io.ReadAll instead of deprecated ioutil — Gap #56)
	openedFile, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open file"})
		return
	}
	defer openedFile.Close()

	fileBytes, err := io.ReadAll(openedFile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}

	if err := h.useCase.UploadDocument(c.Request.Context(), doc, fileBytes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, doc)
}

func (h *DocumentHandler) GetByOwner(c *gin.Context) {
	ownerID, err := uuid.Parse(c.Param("owner_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid owner ID"})
		return
	}

	docs, err := h.useCase.GetDocumentsByOwner(c.Request.Context(), ownerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, docs)
}

func (h *DocumentHandler) Download(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
		return
	}

	doc, fileBytes, err := h.useCase.DownloadDocument(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Safely encode the filename in Content-Disposition (Gap #44)
	params := map[string]string{"filename": doc.Title}
	disposition := mime.FormatMediaType("attachment", params)
	c.Header("Content-Disposition", disposition)
	c.Data(http.StatusOK, doc.FileMimeType, fileBytes)
}

func (h *DocumentHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
		return
	}

	if err := h.useCase.DeleteDocument(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Document deleted successfully"})
}

