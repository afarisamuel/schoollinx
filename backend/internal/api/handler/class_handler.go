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

		// Subject assignments
		g.GET("/:id/subjects", h.GetClassSubjects)
		g.PUT("/:id/subjects", h.SetClassSubjects)
	}
}

func (h *ClassHandler) ListClasses(c *gin.Context) {
	role, exists := c.Get("role")
	if exists && role == domain.RoleTeacher {
		userIDVal, uExists := c.Get("userID")
		if uExists {
			userID := userIDVal.(uuid.UUID)
			classes, err := h.classUseCase.GetClassesForTeacher(c.Request.Context(), userID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			if len(classes) == 0 {
				// If teacher has no specific class allocations yet, fall back to institutional classes so they aren't locked out
				classes, _ = h.classUseCase.GetAllClasses(c.Request.Context())
			}
			if classes == nil {
				classes = []domain.Class{}
			}
			c.JSON(http.StatusOK, classes)
			return
		}
	}

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

func (h *ClassHandler) GetClassSubjects(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class ID format"})
		return
	}
	subjects, err := h.classRepo.GetClassSubjects(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if subjects == nil {
		subjects = []domain.Subject{}
	}
	c.JSON(http.StatusOK, subjects)
}

func (h *ClassHandler) SetClassSubjects(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class ID format"})
		return
	}
	var req struct {
		SubjectIDs []uuid.UUID `json:"subject_ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.classRepo.SetClassSubjects(c.Request.Context(), id, req.SubjectIDs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Subjects updated successfully"})
}
