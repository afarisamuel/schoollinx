package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

// AllPermissions is the complete list of permissions in the system.
var AllPermissions = []map[string]string{
	{"key": domain.PermStudentsRead, "label": "Read Students", "group": "Students"},
	{"key": domain.PermStudentsWrite, "label": "Write Students", "group": "Students"},
	{"key": domain.PermStudentsDelete, "label": "Delete Students", "group": "Students"},
	{"key": domain.PermTeachersRead, "label": "Read Teachers", "group": "Teachers"},
	{"key": domain.PermTeachersWrite, "label": "Write Teachers", "group": "Teachers"},
	{"key": domain.PermTeachersDelete, "label": "Delete Teachers", "group": "Teachers"},
	{"key": domain.PermGradesRead, "label": "Read Grades", "group": "Grades"},
	{"key": domain.PermGradesWrite, "label": "Write Grades", "group": "Grades"},
	{"key": domain.PermAttendanceRead, "label": "Read Attendance", "group": "Attendance"},
	{"key": domain.PermAttendanceWrite, "label": "Write Attendance", "group": "Attendance"},
	{"key": domain.PermFiscalRead, "label": "Read Fiscal", "group": "Fiscal"},
	{"key": domain.PermFiscalWrite, "label": "Write Fiscal", "group": "Fiscal"},
	{"key": domain.PermMessagesRead, "label": "Read Messages", "group": "Communications"},
	{"key": domain.PermMessagesWrite, "label": "Write Messages", "group": "Communications"},
	{"key": domain.PermReportsRead, "label": "Read Reports", "group": "Reports"},
	{"key": domain.PermReportsGenerate, "label": "Generate Reports", "group": "Reports"},
	{"key": domain.PermLibraryRead, "label": "Read Library", "group": "Library"},
	{"key": domain.PermLibraryWrite, "label": "Write Library", "group": "Library"},
	{"key": domain.PermTimetableRead, "label": "Read Timetable", "group": "Timetable"},
	{"key": domain.PermTimetableWrite, "label": "Write Timetable", "group": "Timetable"},
	{"key": domain.PermAuditRead, "label": "Read Audit Logs", "group": "System"},
	{"key": domain.PermSystemAdmin, "label": "System Admin", "group": "System"},
	{"key": domain.PermHRRead, "label": "Read HR Data", "group": "HR"},
	{"key": domain.PermHRWrite, "label": "Write HR Data", "group": "HR"},
	{"key": domain.PermLogisticsRead, "label": "Read Logistics", "group": "Logistics"},
	{"key": domain.PermLogisticsWrite, "label": "Write Logistics", "group": "Logistics"},
	{"key": domain.PermWelfareRead, "label": "Read Welfare", "group": "Welfare"},
	{"key": domain.PermWelfareWrite, "label": "Write Welfare", "group": "Welfare"},
	{"key": domain.PermInventoryRead, "label": "Read Inventory", "group": "Inventory"},
	{"key": domain.PermInventoryWrite, "label": "Write Inventory", "group": "Inventory"},
	{"key": domain.PermProcurementRead, "label": "Read Procurement", "group": "Procurement"},
	{"key": domain.PermProcurementWrite, "label": "Write Procurement", "group": "Procurement"},
	{"key": domain.PermFacilityRead, "label": "Read Facility", "group": "Facility"},
	{"key": domain.PermFacilityWrite, "label": "Write Facility", "group": "Facility"},
	{"key": domain.PermExamsRead, "label": "Read Exams", "group": "Exams"},
	{"key": domain.PermExamsWrite, "label": "Write Exams", "group": "Exams"},
}

// AllRoles is the list of configurable roles (excludes super admin).
var AllRoles = []domain.Role{
	domain.RoleAdmin,
	domain.RoleTeacher,
	domain.RoleStudent,
	domain.RoleGuardian,
	domain.RoleLibrarian,
	domain.RoleAccountant,
	domain.RoleBursar,
	domain.RoleHRManager,
	domain.RoleLogisticsManager,
	domain.RoleOperationsManager,
	domain.RoleHeadmaster,
	domain.RoleClerk,
	domain.RoleNurse,
	domain.RoleITAdmin,
}

type RolesHandler struct {
	userRepo domain.UserRepository
}

func NewRolesHandler(r *gin.RouterGroup, userRepo domain.UserRepository) {
	h := &RolesHandler{userRepo: userRepo}
	r.GET("/roles", h.GetRoles)
	r.GET("/roles/permissions", h.GetAllPermissions)
	r.GET("/users/all", h.GetAllUsers)
	r.PUT("/users/:id/permissions", h.UpdateUserPermissions)
}

// GetRoles returns each role and its default permissions.
func (h *RolesHandler) GetRoles(c *gin.Context) {
	result := make([]map[string]interface{}, 0, len(AllRoles))
	for _, role := range AllRoles {
		result = append(result, map[string]interface{}{
			"role":        role,
			"permissions": domain.GetPermissionsForRole(role),
		})
	}
	c.JSON(http.StatusOK, result)
}

// GetAllPermissions returns the full flat list of permission keys + metadata.
func (h *RolesHandler) GetAllPermissions(c *gin.Context) {
	c.JSON(http.StatusOK, AllPermissions)
}

// GetAllUsers returns all users in the tenant with their role.
func (h *RolesHandler) GetAllUsers(c *gin.Context) {
	users, err := h.userRepo.GetAll(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}
	c.JSON(http.StatusOK, users)
}

// UpdateUserPermissions updates the custom permissions for a specific user.
func (h *RolesHandler) UpdateUserPermissions(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
		return
	}

	var req struct {
		CustomPermissions []string `json:"custom_permissions"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	user, err := h.userRepo.GetByID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	user.CustomPermissions = req.CustomPermissions
	if err := h.userRepo.Update(c.Request.Context(), user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user permissions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User permissions updated successfully"})
}
