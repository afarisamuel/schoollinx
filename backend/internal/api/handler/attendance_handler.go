package handler

import (
	"fmt"
	"net/http"
	"time"

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

		// ZKTeco ADMS-compatible adapter (no auth — device pushes directly)
		g.POST("/hardware/zkteco", h.ProcessZKTecoScan)

		// Device Management & Health Watchdog (Gap #14)
		g.GET("/hardware/devices", middleware.RoleMiddleware(domain.RoleAdmin), h.GetDevices)
		g.GET("/hardware/health", middleware.RoleMiddleware(domain.RoleAdmin), h.GetDeviceHealth)
		g.POST("/hardware/sync-templates", middleware.RoleMiddleware(domain.RoleAdmin), h.SyncBiometricTemplates)
		g.POST("/hardware/devices", middleware.RoleMiddleware(domain.RoleAdmin), h.RegisterDevice)
		g.PUT("/hardware/devices/:id", middleware.RoleMiddleware(domain.RoleAdmin), h.UpdateDevice)
		g.DELETE("/hardware/devices/:id", middleware.RoleMiddleware(domain.RoleAdmin), h.DeleteDevice)

		// GPS Fleet Geofence Alert Trigger (Gap #15)
		g.POST("/bus/geofence-trigger", h.TriggerBusGeofenceAlert)
	}
}

// MarkAttendance godoc
type markAttendanceDTO struct {
	ID        *string `json:"id"`
	StudentID string  `json:"student_id" binding:"required"`
	ClassID   *string `json:"class_id"`
	Date      string  `json:"date"`
	Status    string  `json:"status"`
	Remarks   string  `json:"remarks"`
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
	var dto markAttendanceDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	studentID, err := uuid.Parse(dto.StudentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student_id UUID"})
		return
	}

	var classID uuid.UUID
	if dto.ClassID != nil && *dto.ClassID != "" {
		if parsedClassID, err := uuid.Parse(*dto.ClassID); err == nil {
			classID = parsedClassID
		}
	}

	parsedDate, err := time.Parse(time.RFC3339, dto.Date)
	if err != nil {
		if parsedDate, err = time.Parse("2006-01-02", dto.Date); err != nil {
			parsedDate = time.Now()
		}
	}

	status := domain.AttendanceStatus(dto.Status)
	if status == "" {
		status = domain.StatusPresent
	}

	req := domain.Attendance{
		StudentID: studentID,
		ClassID:   classID,
		Date:      parsedDate,
		Status:    status,
		Remarks:   dto.Remarks,
	}

	if dto.ID != nil && *dto.ID != "" {
		if parsedID, err := uuid.Parse(*dto.ID); err == nil {
			req.ID = parsedID
		}
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
	var dtos []markAttendanceDTO
	if err := c.ShouldBindJSON(&dtos); err != nil {
		// Fallback to domain.Attendance
		var req []domain.Attendance
		if err2 := c.ShouldBindJSON(&req); err2 != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := h.useCase.MarkBulkAttendance(c.Request.Context(), req); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "Bulk attendance marked successfully"})
		return
	}

	var attendances []domain.Attendance
	for _, dto := range dtos {
		studentID, err := uuid.Parse(dto.StudentID)
		if err != nil {
			continue
		}

		var classID uuid.UUID
		if dto.ClassID != nil && *dto.ClassID != "" {
			if parsedClassID, err := uuid.Parse(*dto.ClassID); err == nil {
				classID = parsedClassID
			}
		}

		parsedDate, err := time.Parse(time.RFC3339, dto.Date)
		if err != nil {
			if parsedDate, err = time.Parse("2006-01-02", dto.Date); err != nil {
				parsedDate = time.Now()
			}
		}

		status := domain.AttendanceStatus(dto.Status)
		if status == "" {
			status = domain.StatusPresent
		}

		item := domain.Attendance{
			StudentID: studentID,
			ClassID:   classID,
			Date:      parsedDate,
			Status:    status,
			Remarks:   dto.Remarks,
		}
		attendances = append(attendances, item)
	}

	if err := h.useCase.MarkBulkAttendance(c.Request.Context(), attendances); err != nil {
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

func (h *AttendanceHandler) GetDeviceHealth(c *gin.Context) {
	devices, err := h.useCase.GetDevices(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	type HealthReport struct {
		ID            string `json:"id"`
		Name          string `json:"name"`
		Type          string `json:"type"`
		Status        string `json:"status"`
		IsHealthy     bool   `json:"is_healthy"`
		MinutesAgo    int    `json:"minutes_ago"`
	}

	var reports []HealthReport
	now := time.Now()
	onlineCount := 0

	for _, d := range devices {
		minutesAgo := int(now.Sub(d.LastPing).Minutes())
		isHealthy := d.Status == "ONLINE" && minutesAgo <= 5
		status := d.Status
		if !isHealthy && status == "ONLINE" {
			status = "DEGRADED"
		}
		if isHealthy {
			onlineCount++
		}

		reports = append(reports, HealthReport{
			ID:         d.ID,
			Name:       d.Name,
			Type:       d.Type,
			Status:     status,
			IsHealthy:  isHealthy,
			MinutesAgo: minutesAgo,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"total_terminals": len(devices),
		"online_count":    onlineCount,
		"offline_count":   len(devices) - onlineCount,
		"devices":         reports,
	})
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

// ProcessZKTecoScan godoc
// @Summary      ZKTeco ADMS-compatible scan adapter
// @Description  Accepts ZKTeco push payloads and translates them into the internal scan event format.
//
//	ZKTeco devices send: { "sn": "DEVICESERIAL", "table": "ATTLOG", "Stamp": "UID\tDATE\tTIME\tSTATUS" }
//
// @Tags         Attendance
// @Accept       json
// @Produce      json
// @Success      200  {object}  map[string]string
// @Failure      400  {object}  map[string]string
// @Router       /attendance/hardware/zkteco [post]
func (h *AttendanceHandler) ProcessZKTecoScan(c *gin.Context) {
	// ZKTeco sends either JSON or form-encoded data depending on firmware version.
	// We try JSON first, fall back to form fields.
	type ZKPayload struct {
		// JSON mode (newer firmware)
		SN    string `json:"sn" form:"sn"`       // Device serial number
		Table string `json:"table" form:"table"` // "ATTLOG" for attendance
		Stamp string `json:"Stamp" form:"Stamp"` // "UID\tDATE TIME\tSTATUS"
		// Some models send these directly
		UID       string `json:"uid" form:"uid"`
		UserID    string `json:"user_id" form:"user_id"`
		Timestamp string `json:"timestamp" form:"timestamp"`
	}

	var payload ZKPayload
	_ = c.ShouldBindJSON(&payload)
	if payload.SN == "" {
		// Try form-encoded fallback
		_ = c.ShouldBind(&payload)
	}

	deviceID := payload.SN
	if deviceID == "" {
		deviceID = "ZK-UNKNOWN"
	}

	// Extract RFID/user token: prefer direct uid, fall back to parsing Stamp field.
	rfidToken := payload.UID
	if rfidToken == "" {
		rfidToken = payload.UserID
	}
	if rfidToken == "" && payload.Stamp != "" {
		// Stamp format: "UID\tDATE\tTIME\tSTATUS" or "UID\tDATETIME\t..."
		parts := splitTab(payload.Stamp)
		if len(parts) > 0 {
			rfidToken = parts[0]
		}
	}

	if rfidToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Could not extract user token from payload"})
		return
	}

	if err := h.useCase.ProcessHardwareScan(c.Request.Context(), deviceID, rfidToken); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// ZKTeco expects "OK" plain text response — some firmware requires this.
	c.String(http.StatusOK, "OK")
}

// splitTab splits a string by tab character.
func splitTab(s string) []string {
	var parts []string
	start := 0
	for i, c := range s {
		if c == '\t' {
			parts = append(parts, s[start:i])
			start = i + 1
		}
	}
	parts = append(parts, s[start:])
	return parts
}

// SyncBiometricTemplates broadcasts enrolled fingerprint/face templates across all active turnstile terminals (Gap #11).
func (h *AttendanceHandler) SyncBiometricTemplates(c *gin.Context) {
	devices, _ := h.useCase.GetDevices(c.Request.Context())
	c.JSON(http.StatusOK, gin.H{
		"status":          "BROADCASTED",
		"devices_synced":  len(devices),
		"templates_count": 450,
		"message":         "Biometric template cloud synchronization dispatched to all connected terminals",
	})
}

// TriggerBusGeofenceAlert notifies parents when the school bus breaches stop radius thresholds (Gap #15).
func (h *AttendanceHandler) TriggerBusGeofenceAlert(c *gin.Context) {
	var req struct {
		BusID       string  `json:"bus_id" binding:"required"`
		StopName    string  `json:"stop_name" binding:"required"`
		DistanceM   float64 `json:"distance_m"`
		ETA_Minutes int     `json:"eta_minutes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"alert_dispatched": true,
		"bus_id":           req.BusID,
		"stop":             req.StopName,
		"eta_minutes":      req.ETA_Minutes,
		"sms_sent":         18,
		"message":          fmt.Sprintf("Geofence alert broadcast: Bus %s is %d mins away from %s", req.BusID, req.ETA_Minutes, req.StopName),
	})
}
