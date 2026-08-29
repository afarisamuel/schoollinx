package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
)

type AttendanceHandler struct {
	useCase domain.AttendanceUseCase
}

func NewAttendanceHandler(r *gin.RouterGroup, useCase domain.AttendanceUseCase) {
	h := &AttendanceHandler{useCase: useCase}

	g := r.Group("/attendance")
	{
		g.POST("", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleTeacher), h.MarkAttendance)
		g.POST("/bulk", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleTeacher), h.MarkBulkAttendance)
		g.GET("/student/:id", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleTeacher, domain.RoleStudent, domain.RoleGuardian), h.GetStudentAttendance)
		g.GET("/class/:id", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleTeacher), h.GetClassAttendance)
		g.POST("/analyze", middleware.RoleMiddleware(domain.RoleAdmin), h.AnalyzeAbsences)

		// Hardware APIs (Biometrics)
		g.POST("/hardware/scan", h.ProcessHardwareScan)
		g.GET("/hardware/scans", middleware.RoleMiddleware(domain.RoleAdmin), h.GetRecentScanEvents)

		// Device Management
		g.GET("/hardware/devices", middleware.RoleMiddleware(domain.RoleAdmin), h.GetDevices)
		g.POST("/hardware/devices", middleware.RoleMiddleware(domain.RoleAdmin), h.RegisterDevice)
		g.PUT("/hardware/devices/:id", middleware.RoleMiddleware(domain.RoleAdmin), h.UpdateDevice)
		g.DELETE("/hardware/devices/:id", middleware.RoleMiddleware(domain.RoleAdmin), h.DeleteDevice)
	}
}

// MarkAttendance godoc
// @Summary      Mark a single attendance record
// @Description  Records attendance for one student (admin/teacher only)
// @Tags         Attendance
// @Accept       json
// @Produce      json
// @Param        body  body      domain.Attendance  true  "Attendance record"
// @Success      201   {object}  domain.Attendance
// @Failure      400   {object}  map[string]string
// @Failure      500   {object}  map[string]string
// @Router       /attendance [post]
func (h *AttendanceHandler) MarkAttendance(c *gin.Context) {
	var req domain.Attendance
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.useCase.MarkAttendance(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, req)
}

// MarkBulkAttendance godoc
// @Summary      Mark attendance for a whole class
// @Description  Records attendance for multiple students in one request (admin/teacher only)
// @Tags         Attendance
// @Accept       json
// @Produce      json
// @Param        body  body      []domain.Attendance  true  "Attendance records"
// @Success      201   {object}  map[string]string
// @Failure      400   {object}  map[string]string
// @Failure      500   {object}  map[string]string
// @Router       /attendance/bulk [post]
func (h *AttendanceHandler) MarkBulkAttendance(c *gin.Context) {
	var req []domain.Attendance
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.useCase.MarkBulkAttendance(c.Request.Context(), req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Bulk attendance marked successfully"})
}

// GetStudentAttendance godoc
// @Summary      Get a student's attendance history
// @Description  Returns all attendance records for the given student (admin/teacher/student)
// @Tags         Attendance
// @Produce      json
// @Param        id    path      string  true  "Student UUID"
// @Success      200   {array}   domain.Attendance
// @Failure      400   {object}  map[string]string
// @Failure      500   {object}  map[string]string
// @Router       /attendance/student/{id} [get]
func (h *AttendanceHandler) GetStudentAttendance(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID format"})
		return
	}

	results, err := h.useCase.GetStudentAttendance(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, results)
}

// GetClassAttendance godoc
// @Summary      Get attendance records for a class on a date
// @Description  Returns attendance records for all students in the given class on the specified date
// @Tags         Attendance
// @Produce      json
// @Param        id    path      string  true  "Class UUID"
// @Param        date  query     string  true  "Date (YYYY-MM-DD)"
// @Success      200   {array}   domain.Attendance
// @Failure      400   {object}  map[string]string
// @Failure      500   {object}  map[string]string
// @Router       /attendance/class/{id} [get]
func (h *AttendanceHandler) GetClassAttendance(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class ID format"})
		return
	}

	date := c.Query("date")
	if date == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Date query parameter is required"})
		return
	}

	results, err := h.useCase.GetClassAttendance(c.Request.Context(), id, date)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, results)
}

// AnalyzeAbsences godoc
// @Summary      Trigger absence analysis
// @Description  Analyses attendance records and raises alerts for students exceeding the absence threshold (admin only)
// @Tags         Attendance
// @Produce      json
// @Success      200  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /attendance/analyze [post]
func (h *AttendanceHandler) AnalyzeAbsences(c *gin.Context) {
	threshold := 3 // Default threshold

	if err := h.useCase.AnalyzeAbsences(c.Request.Context(), threshold); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Absences analyzed and alerts triggered where necessary"})
}

// ProcessHardwareScan godoc
// @Summary      Process a biometric/RFID hardware scan
// @Description  Receives a device scan event and records the corresponding attendance entry
// @Tags         Attendance
// @Accept       json
// @Produce      json
// @Param        body  body      object  true  "Scan payload {device_id, rfid_token}"
// @Success      200   {object}  map[string]string
// @Failure      400   {object}  map[string]string
// @Failure      500   {object}  map[string]string
// @Router       /attendance/hardware/scan [post]
func (h *AttendanceHandler) ProcessHardwareScan(c *gin.Context) {
	var req struct {
		DeviceID  string `json:"device_id" binding:"required"`
		RFIDToken string `json:"rfid_token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.useCase.ProcessHardwareScan(c.Request.Context(), req.DeviceID, req.RFIDToken); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Scan received"})
}

// GetRecentScanEvents godoc
// @Summary      List recent hardware scan events
// @Description  Returns the 20 most recent biometric/RFID scan events (admin only)
// @Tags         Attendance
// @Produce      json
// @Success      200  {array}   map[string]interface{}
// @Failure      500  {object}  map[string]string
// @Router       /attendance/hardware/scans [get]
func (h *AttendanceHandler) GetRecentScanEvents(c *gin.Context) {
	limit := 20
	results, err := h.useCase.GetRecentScanEvents(c.Request.Context(), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, results)
}

func (h *AttendanceHandler) GetDevices(c *gin.Context) {
	devices, err := h.useCase.GetDevices(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, devices)
}

func (h *AttendanceHandler) RegisterDevice(c *gin.Context) {
	var req domain.BiometricDevice
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.useCase.RegisterDevice(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, req)
}

func (h *AttendanceHandler) UpdateDevice(c *gin.Context) {
	id := c.Param("id")
	var req domain.BiometricDevice
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.ID = id

	if err := h.useCase.UpdateDevice(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, req)
}

func (h *AttendanceHandler) DeleteDevice(c *gin.Context) {
	id := c.Param("id")
	if err := h.useCase.DeleteDevice(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Device deleted successfully"})
}
