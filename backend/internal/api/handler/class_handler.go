package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type ClassHandler struct {
	classUseCase domain.ClassUseCase
	classRepo    domain.ClassRepository // Phase 19 Extension
}

func NewClassHandler(r *gin.RouterGroup, cuc domain.ClassUseCase, cr domain.ClassRepository) {
	h := &ClassHandler{classUseCase: cuc, classRepo: cr}

	g := r.Group("/classes")
	{
		g.GET("", h.ListClasses)
		g.POST("", h.CreateClass)
		g.GET("/:id", h.GetClass)
		g.PUT("/:id", h.UpdateClass)
		g.DELETE("/:id", h.DeleteClass)

		// Phase 19: Term Locks
		g.GET("/:id/locks", h.GetClassLocks)
		g.POST("/:id/locks", h.UpsertClassLock)
	}
}

func (h *ClassHandler) ListClasses(c *gin.Context) {
	classes, err := h.classUseCase.GetAllClasses(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, classes)
}

func (h *ClassHandler) CreateClass(c *gin.Context) {
	var class domain.Class
	if err := c.ShouldBindJSON(&class); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.classUseCase.CreateClass(c.Request.Context(), &class); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, class)
}

func (h *ClassHandler) GetClass(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class ID format"})
		return
	}
	class, err := h.classUseCase.GetClassByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Class not found"})
		return
	}
	c.JSON(http.StatusOK, class)
}

func (h *ClassHandler) UpdateClass(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class ID format"})
		return
	}
	var class domain.Class
	if err := c.ShouldBindJSON(&class); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	class.ID = id
	if err := h.classUseCase.UpdateClass(c.Request.Context(), &class); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, class)
}

func (h *ClassHandler) DeleteClass(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class ID format"})
		return
	}
	if err := h.classUseCase.DeleteClass(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Class deleted"})
}


func (h *ClassHandler) GetClassLocks(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class ID format"})
		return
	}
	locks, err := h.classRepo.GetLocks(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, locks)
}

func (h *ClassHandler) UpsertClassLock(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class ID format"})
		return
	}
	var lock domain.ClassTermLock
	if err := c.ShouldBindJSON(&lock); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	lock.ClassID = id

	if err := h.classRepo.UpsertLock(c.Request.Context(), &lock); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, lock)
}
