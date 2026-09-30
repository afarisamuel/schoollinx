package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/usecase"
)

type TimetableHandler struct {
	useCase *usecase.TimetableUseCase
}

func NewTimetableHandler(r *gin.RouterGroup, uc *usecase.TimetableUseCase) {
	h := &TimetableHandler{useCase: uc}

	g := r.Group("/timetable")
	{
		g.POST("", h.AddEntry)
		g.POST("/auto-generate", h.AutoGenerateTimetable)
		g.DELETE("/class/:id/clear", h.ClearClassTimetable)
		g.GET("/available-teachers", h.GetAvailableTeachers)
		g.GET("/audit", h.AuditTimetable)
		g.GET("/unavailability", h.GetTeacherUnavailabilities)
		g.POST("/unavailability", h.CreateTeacherUnavailability)
		g.DELETE("/unavailability/:id", h.DeleteTeacherUnavailability)
		g.POST("/send-digest", h.SendTeacherDailyScheduleDigest)
		g.POST("/move-slot", h.MoveOrSwapEntry)
		g.GET("/master-schedule", h.GetMasterSchedule)
		g.GET("/room-occupancy", h.GetRoomOccupancy)
		g.POST("/optimize-ai", h.OptimizeTimetableAI)
		g.POST("/exam/auto-invigilate", h.AutoAssignExamInvigilators)
		g.GET("/exam/master-schedule", h.GetExamMasterSchedule)
		g.GET("/feed/class/:id/schedule.ics", h.GetClassICSFeed)
		g.GET("/feed/teacher/:id/schedule.ics", h.GetTeacherICSFeed)
		g.DELETE("/:id", h.RemoveEntry)
		g.GET("/class/:id", h.GetClassTimetable)
		g.GET("/teacher/:id", h.GetTeacherTimetable)
		g.POST("/detect-clashes", h.DetectClashes)
		g.POST("/exam/generate", h.GenerateExamSchedule)
		g.GET("/exam/class/:id", h.GetExamSchedule)
		g.GET("/exam/period/:id", h.GetExamScheduleByPeriod)
		g.POST("/exam/session", h.CreateExamSession)
		g.DELETE("/exam/session/:id", h.DeleteExamSession)
		// Rec #4 – Absence & substitution
		g.POST("/absence", h.MarkTeacherAbsent)
		g.POST("/absence/:id/assign", h.AssignSubstitute)
		g.GET("/absence/active", h.GetActiveAbsences)
		g.POST("/absence/:id/resolve", h.ResolveAbsence)
		// Rec #5 – Substitute audit log
		g.POST("/substitute-log", h.LogSubstituteTeaching)
		g.GET("/substitute-logs", h.GetSubstituteLogs)
		// Rec #6 – Snapshots
		g.POST("/snapshot", h.CreateSnapshot)
		g.GET("/snapshots", h.ListSnapshots)
		g.POST("/snapshot/:id/restore", h.RestoreSnapshot)
		// Rec #7 – Cognitive weights
		g.POST("/cognitive-weight", h.SetSubjectCognitiveWeight)
		g.GET("/cognitive-weights", h.GetSubjectCognitiveWeights)
		// Rec #8 – Templates
		g.POST("/template", h.SaveTimetableTemplate)
		g.GET("/templates", h.ListTimetableTemplates)
		g.POST("/template/:id/apply", h.ApplyTimetableTemplate)
		// Rec #9 – Invigilation load
		g.GET("/exam/invigilation-load", h.GetInvigilatorDutyLoadReport)
		g.POST("/exam/invigilation-rebalance", h.RebalanceInvigilationDuties)
	}
}

func (h *TimetableHandler) AddEntry(c *gin.Context) {
	var req domain.TimetableEntry
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.useCase.AddEntry(c.Request.Context(), &req); err != nil {
		if appErr, ok := err.(*domain.AppError); ok {
			c.JSON(appErr.Status, gin.H{"error": appErr.Message, "code": appErr.Code})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, req)
}

func (h *TimetableHandler) GetClassTimetable(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID format"})
		return
	}
	entries, err := h.useCase.GetClassTimetable(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, entries)
}

func (h *TimetableHandler) GetTeacherTimetable(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid teacher ID format"})
		return
	}
	entries, err := h.useCase.GetTeacherTimetable(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, entries)
}

func (h *TimetableHandler) RemoveEntry(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid entry ID format"})
		return
	}
	if err := h.useCase.RemoveEntry(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Entry removed successfully"})
}

func (h *TimetableHandler) GenerateExamSchedule(c *gin.Context) {
	var req struct {
		AcademicPeriodID uuid.UUID `json:"academic_period_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.useCase.AutoGenerateExamSchedule(c.Request.Context(), req.AcademicPeriodID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Exam schedule generated successfully"})
}

func (h *TimetableHandler) GetExamSchedule(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID format"})
		return
	}
	
	sessions, err := h.useCase.GetExamSchedule(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, sessions)
}

func (h *TimetableHandler) GetExamScheduleByPeriod(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid period ID format"})
		return
	}

	sessions, err := h.useCase.GetExamScheduleByPeriod(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, sessions)
}

func (h *TimetableHandler) CreateExamSession(c *gin.Context) {
	var req domain.ExamSession
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.useCase.CreateExamSession(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, req)
}

func (h *TimetableHandler) DeleteExamSession(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session ID format"})
		return
	}

	if err := h.useCase.DeleteExamSession(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Exam session deleted successfully"})
}

// DetectClashes analyzes potential scheduling overlaps across classes, teachers, and rooms (Gap #17).
func (h *TimetableHandler) DetectClashes(c *gin.Context) {
	var req struct {
		ClassID   uuid.UUID `json:"class_id" binding:"required"`
		TeacherID uuid.UUID `json:"teacher_id" binding:"required"`
		DayOfWeek int       `json:"day_of_week" binding:"required"`
		StartTime string    `json:"start_time" binding:"required"`
		EndTime   string    `json:"end_time" binding:"required"`
		Room      string    `json:"room"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	type ClashWarning struct {
		Type        string `json:"type"` // TEACHER_DOUBLE_BOOKED, ROOM_COLLISION, CLASS_OVERLAP
		Description string `json:"description"`
		Severity    string `json:"severity"` // HIGH, CRITICAL
	}

	var clashes []ClashWarning

	// Check teacher schedule
	teacherEntries, _ := h.useCase.GetTeacherTimetable(c.Request.Context(), req.TeacherID)
	for _, entry := range teacherEntries {
		if entry.DayOfWeek == req.DayOfWeek {
			if (req.StartTime >= entry.StartTime && req.StartTime < entry.EndTime) ||
				(req.EndTime > entry.StartTime && req.EndTime <= entry.EndTime) ||
				(req.StartTime <= entry.StartTime && req.EndTime >= entry.EndTime) {
				clashes = append(clashes, ClashWarning{
					Type:        "TEACHER_DOUBLE_BOOKED",
					Description: "Assigned teacher already has an active class session during this time slot",
					Severity:    "CRITICAL",
				})
				break
			}
		}
	}

	// Check class schedule
	classEntries, _ := h.useCase.GetClassTimetable(c.Request.Context(), req.ClassID)
	for _, entry := range classEntries {
		if entry.DayOfWeek == req.DayOfWeek {
			if (req.StartTime >= entry.StartTime && req.StartTime < entry.EndTime) ||
				(req.EndTime > entry.StartTime && req.EndTime <= entry.EndTime) ||
				(req.StartTime <= entry.StartTime && req.EndTime >= entry.EndTime) {
				clashes = append(clashes, ClashWarning{
					Type:        "CLASS_OVERLAP",
					Description: "Target cohort already has another scheduled subject at this time",
					Severity:    "CRITICAL",
				})
				break
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"has_clash":    len(clashes) > 0,
		"clash_count":  len(clashes),
		"clashes":      clashes,
		"is_safe":      len(clashes) == 0,
	})
}

func (h *TimetableHandler) AutoGenerateTimetable(c *gin.Context) {
	var req struct {
		ClassID       *uuid.UUID `json:"class_id"`
		ClearExisting bool       `json:"clear_existing"`
	}
	_ = c.ShouldBindJSON(&req)

	entries, classCount, err := h.useCase.AutoGenerateTimetable(c.Request.Context(), req.ClassID, req.ClearExisting)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":        true,
		"message":        "Weekly timetable generated successfully with zero scheduling conflicts",
		"entries_count":  len(entries),
		"classes_count":  classCount,
	})
}

func (h *TimetableHandler) ClearClassTimetable(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID format"})
		return
	}

	if err := h.useCase.ClearClassTimetable(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Class timetable schedule cleared successfully",
	})
}

func (h *TimetableHandler) GetAvailableTeachers(c *gin.Context) {
	dayStr := c.Query("day_of_week")
	startTime := c.Query("start_time")
	endTime := c.Query("end_time")

	dayOfWeek, _ := strconv.Atoi(dayStr)
	if dayOfWeek <= 0 {
		dayOfWeek = 1
	}
	if startTime == "" {
		startTime = "08:00"
	}
	if endTime == "" {
		endTime = "08:45"
	}

	teachers, err := h.useCase.GetAvailableTeachers(c.Request.Context(), dayOfWeek, startTime, endTime)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, teachers)
}

func (h *TimetableHandler) AuditTimetable(c *gin.Context) {
	var classIDPtr *uuid.UUID
	classIDStr := c.Query("class_id")
	if classIDStr != "" {
		if id, err := uuid.Parse(classIDStr); err == nil {
			classIDPtr = &id
		}
	}

	report, err := h.useCase.AuditTimetable(c.Request.Context(), classIDPtr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, report)
}

func (h *TimetableHandler) GetTeacherUnavailabilities(c *gin.Context) {
	var teacherIDPtr *uuid.UUID
	tIDStr := c.Query("teacher_id")
	if tIDStr != "" {
		if id, err := uuid.Parse(tIDStr); err == nil {
			teacherIDPtr = &id
		}
	}

	list, err := h.useCase.GetTeacherUnavailabilities(c.Request.Context(), teacherIDPtr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, list)
}

func (h *TimetableHandler) CreateTeacherUnavailability(c *gin.Context) {
	var req domain.TeacherUnavailability
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.useCase.CreateTeacherUnavailability(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, req)
}

func (h *TimetableHandler) DeleteTeacherUnavailability(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID format"})
		return
	}

	if err := h.useCase.DeleteTeacherUnavailability(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Unavailability constraint removed successfully"})
}

func (h *TimetableHandler) SendTeacherDailyScheduleDigest(c *gin.Context) {
	var req struct {
		DayOfWeek int `json:"day_of_week"`
	}
	_ = c.ShouldBindJSON(&req)
	if req.DayOfWeek <= 0 {
		req.DayOfWeek = 1
	}

	count, err := h.useCase.SendTeacherDailyScheduleDigest(c.Request.Context(), req.DayOfWeek)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":          true,
		"dispatched_count": count,
		"message":          "Daily teaching schedule digest dispatched to all active instructors.",
	})
}

func (h *TimetableHandler) MoveOrSwapEntry(c *gin.Context) {
	var req struct {
		EntryID         uuid.UUID `json:"entry_id" binding:"required"`
		TargetDay       int       `json:"target_day" binding:"required"`
		TargetStartTime string    `json:"target_start_time" binding:"required"`
		TargetEndTime   string    `json:"target_end_time" binding:"required"`
		TargetRoom      string    `json:"target_room"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	moved, swapped, err := h.useCase.MoveOrSwapEntry(c.Request.Context(), req.EntryID, req.TargetDay, req.TargetStartTime, req.TargetEndTime, req.TargetRoom)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"moved":   moved,
		"swapped": swapped,
		"message": "Timetable slot updated successfully",
	})
}

func (h *TimetableHandler) GetMasterSchedule(c *gin.Context) {
	dayStr := c.Query("day_of_week")
	dayOfWeek, _ := strconv.Atoi(dayStr)
	if dayOfWeek <= 0 {
		dayOfWeek = 1
	}

	entries, err := h.useCase.GetMasterSchedule(c.Request.Context(), dayOfWeek)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, entries)
}

func (h *TimetableHandler) GetRoomOccupancy(c *gin.Context) {
	dayStr := c.Query("day_of_week")
	dayOfWeek, _ := strconv.Atoi(dayStr)
	if dayOfWeek <= 0 {
		dayOfWeek = 1
	}

	slots, err := h.useCase.GetRoomOccupancy(c.Request.Context(), dayOfWeek)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, slots)
}

func (h *TimetableHandler) OptimizeTimetableAI(c *gin.Context) {
	var req struct {
		ClassID *uuid.UUID `json:"class_id"`
	}
	_ = c.ShouldBindJSON(&req)

	result, err := h.useCase.OptimizeTimetableAI(c.Request.Context(), req.ClassID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *TimetableHandler) AutoAssignExamInvigilators(c *gin.Context) {
	var req struct {
		AcademicPeriodID uuid.UUID `json:"academic_period_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	report, err := h.useCase.AutoAssignExamInvigilators(c.Request.Context(), req.AcademicPeriodID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, report)
}

func (h *TimetableHandler) GetExamMasterSchedule(c *gin.Context) {
	pIDStr := c.Query("academic_period_id")
	if pIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "academic_period_id is required"})
		return
	}
	pID, err := uuid.Parse(pIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid academic_period_id format"})
		return
	}

	sessions, err := h.useCase.GetExamMasterSchedule(c.Request.Context(), pID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, sessions)
}

func (h *TimetableHandler) GetClassICSFeed(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.String(http.StatusBadRequest, "Invalid class ID")
		return
	}

	icsContent, err := h.useCase.GenerateClassICSFeed(c.Request.Context(), id)
	if err != nil {
		c.String(http.StatusInternalServerError, "Failed to generate calendar feed: "+err.Error())
		return
	}

	c.Header("Content-Type", "text/calendar; charset=utf-8")
	c.Header("Content-Disposition", "inline; filename=\"class_schedule.ics\"")
	c.String(http.StatusOK, icsContent)
}

func (h *TimetableHandler) GetTeacherICSFeed(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.String(http.StatusBadRequest, "Invalid teacher ID")
		return
	}

	icsContent, err := h.useCase.GenerateTeacherICSFeed(c.Request.Context(), id)
	if err != nil {
		c.String(http.StatusInternalServerError, "Failed to generate calendar feed: "+err.Error())
		return
	}

	c.Header("Content-Type", "text/calendar; charset=utf-8")
	c.Header("Content-Disposition", "inline; filename=\"teacher_schedule.ics\"")
	c.String(http.StatusOK, icsContent)
}

// ═══════════════════════════════════════════════════════
// RECOMMENDATION #4 — ABSENCE & SUBSTITUTION
// ═══════════════════════════════════════════════════════

func (h *TimetableHandler) MarkTeacherAbsent(c *gin.Context) {
	var req struct {
		TeacherID string `json:"teacher_id" binding:"required"`
		Reason    string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tid, err := uuid.Parse(req.TeacherID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid teacher_id"})
		return
	}
	result, err := h.useCase.MarkTeacherAbsent(c.Request.Context(), tid, req.Reason)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *TimetableHandler) AssignSubstitute(c *gin.Context) {
	absenceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid absence id"})
		return
	}
	var req struct {
		SubstituteID string `json:"substitute_id" binding:"required"`
		EntryID      string `json:"entry_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	subID, _ := uuid.Parse(req.SubstituteID)
	entID, _ := uuid.Parse(req.EntryID)
	result, err := h.useCase.AssignSubstitute(c.Request.Context(), absenceID, subID, entID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *TimetableHandler) GetActiveAbsences(c *gin.Context) {
	absences, err := h.useCase.GetActiveAbsences(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"absences": absences})
}

func (h *TimetableHandler) ResolveAbsence(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := h.useCase.ResolveAbsence(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Absence resolved."})
}

// ═══════════════════════════════════════════════════════
// RECOMMENDATION #5 — SUBSTITUTE AUDIT LOG
// ═══════════════════════════════════════════════════════

func (h *TimetableHandler) LogSubstituteTeaching(c *gin.Context) {
	var req domain.SubstituteLog
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.useCase.LogSubstituteTeaching(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, req)
}

func (h *TimetableHandler) GetSubstituteLogs(c *gin.Context) {
	var entryID *uuid.UUID
	if raw := c.Query("entry_id"); raw != "" {
		parsed, err := uuid.Parse(raw)
		if err == nil {
			entryID = &parsed
		}
	}
	logs, err := h.useCase.GetSubstituteLogs(c.Request.Context(), entryID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"logs": logs})
}

// ═══════════════════════════════════════════════════════
// RECOMMENDATION #6 — TIMETABLE SNAPSHOTS
// ═══════════════════════════════════════════════════════

func (h *TimetableHandler) CreateSnapshot(c *gin.Context) {
	var req struct {
		Label string `json:"label"`
	}
	_ = c.ShouldBindJSON(&req)
	snap, err := h.useCase.CreateSnapshot(c.Request.Context(), req.Label)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, snap)
}

func (h *TimetableHandler) ListSnapshots(c *gin.Context) {
	snaps, err := h.useCase.ListSnapshots(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"snapshots": snaps})
}

func (h *TimetableHandler) RestoreSnapshot(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	result, err := h.useCase.RestoreSnapshot(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

// ═══════════════════════════════════════════════════════
// RECOMMENDATION #7 — COGNITIVE WEIGHT
// ═══════════════════════════════════════════════════════

func (h *TimetableHandler) SetSubjectCognitiveWeight(c *gin.Context) {
	var w domain.SubjectCognitiveWeight
	if err := c.ShouldBindJSON(&w); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.useCase.SetSubjectCognitiveWeight(c.Request.Context(), &w); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, w)
}

func (h *TimetableHandler) GetSubjectCognitiveWeights(c *gin.Context) {
	weights, err := h.useCase.GetSubjectCognitiveWeights(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"weights": weights})
}

// ═══════════════════════════════════════════════════════
// RECOMMENDATION #8 — TEMPLATES
// ═══════════════════════════════════════════════════════

func (h *TimetableHandler) SaveTimetableTemplate(c *gin.Context) {
	var t domain.TimetableTemplate
	if err := c.ShouldBindJSON(&t); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.useCase.SaveTimetableTemplate(c.Request.Context(), &t); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, t)
}

func (h *TimetableHandler) ListTimetableTemplates(c *gin.Context) {
	templates, err := h.useCase.ListTimetableTemplates(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"templates": templates})
}

func (h *TimetableHandler) ApplyTimetableTemplate(c *gin.Context) {
	tid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid template id"})
		return
	}
	var req struct {
		ClearExisting bool `json:"clear_existing"`
	}
	_ = c.ShouldBindJSON(&req)
	count, err := h.useCase.ApplyTimetableTemplate(c.Request.Context(), tid, req.ClearExisting)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"entries_created": count, "message": "Template applied successfully."})
}

// ═══════════════════════════════════════════════════════
// RECOMMENDATION #9 — INVIGILATION DUTY LOAD
// ═══════════════════════════════════════════════════════

func (h *TimetableHandler) GetInvigilatorDutyLoadReport(c *gin.Context) {
	periodID, err := uuid.Parse(c.Query("academic_period_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "academic_period_id required"})
		return
	}
	report, err := h.useCase.GetInvigilatorDutyLoadReport(c.Request.Context(), periodID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, report)
}

func (h *TimetableHandler) RebalanceInvigilationDuties(c *gin.Context) {
	var req struct {
		AcademicPeriodID string `json:"academic_period_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	periodID, err := uuid.Parse(req.AcademicPeriodID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid academic_period_id"})
		return
	}
	report, err := h.useCase.RebalanceInvigilationDuties(c.Request.Context(), periodID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, report)
}



