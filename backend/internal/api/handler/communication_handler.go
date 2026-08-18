package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type CommunicationHandler struct {
	useCase domain.CommunicationUseCase
}

func NewCommunicationHandler(api *gin.RouterGroup, uc domain.CommunicationUseCase) {
	h := &CommunicationHandler{useCase: uc}
	comm := api.Group("/communication")
	{
		comm.POST("/notices", h.CreateNotice)
		comm.GET("/notices", h.GetNotices)
		comm.POST("/reminders", h.ScheduleReminder)
		comm.GET("/reminders", h.GetReminders)
		comm.POST("/sms/send", h.SendUrgentSMS)
		comm.POST("/meeting-slots", h.CreateMeetingSlot)
		comm.GET("/meeting-slots/:teacherID", h.GetMeetingSlots)
		comm.POST("/meeting-bookings", h.BookMeeting)
		comm.GET("/meeting-bookings/guardian/:guardianID", h.GetBookingsByGuardian)

		comm.POST("/whatsapp/webhook", h.ReceiveWhatsAppWebhook)
		comm.POST("/whatsapp/send", h.SendWhatsAppMessage)
		comm.POST("/whatsapp/messages", h.GetWhatsAppMessages)

		comm.POST("/birthdays/trigger", h.TriggerBirthdays)
		comm.POST("/emergency/lockdown", h.TriggerLockdown)
	}
}

func (h *CommunicationHandler) CreateNotice(c *gin.Context) {
	var notice domain.Notice
	if err := c.ShouldBindJSON(&notice); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}
	
	if err := h.useCase.CreateNotice(c.Request.Context(), &notice); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create notice"})
		return
	}
	c.JSON(http.StatusCreated, notice)
}

func (h *CommunicationHandler) GetNotices(c *gin.Context) {
	target := c.Query("target")
	notices, err := h.useCase.GetNotices(c.Request.Context(), target)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notices"})
		return
	}
	c.JSON(http.StatusOK, notices)
}

func (h *CommunicationHandler) ScheduleReminder(c *gin.Context) {
	var reminder domain.Reminder
	if err := c.ShouldBindJSON(&reminder); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}
	
	if err := h.useCase.ScheduleReminder(c.Request.Context(), &reminder); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to schedule reminder"})
		return
	}
	c.JSON(http.StatusCreated, reminder)
}

func (h *CommunicationHandler) GetReminders(c *gin.Context) {
	reminders, err := h.useCase.GetReminders(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reminders"})
		return
	}
	c.JSON(http.StatusOK, reminders)
}

func (h *CommunicationHandler) SendUrgentSMS(c *gin.Context) {
	var req struct {
		TargetAudience string `json:"target_audience" binding:"required"`
		Message        string `json:"message" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}
	
	if err := h.useCase.SendUrgentSMS(c.Request.Context(), req.TargetAudience, req.Message); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send SMS"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "SMS sent successfully via Arkasel"})
}

func (h *CommunicationHandler) TriggerLockdown(c *gin.Context) {
	// Broadcast an emergency message to ALL targets
	message := "URGENT: EMERGENCY LOCKDOWN INITIATED. Please remain in your current location, secure all doors, and await further instructions from administration."
	if err := h.useCase.SendUrgentSMS(c.Request.Context(), "ALL", message); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to trigger lockdown: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Lockdown initiated and broadcast sent successfully"})
}

func (h *CommunicationHandler) CreateMeetingSlot(c *gin.Context) {
	var slot domain.MeetingSlot
	if err := c.ShouldBindJSON(&slot); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}
	if err := h.useCase.CreateMeetingSlot(c.Request.Context(), &slot); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create meeting slot"})
		return
	}
	c.JSON(http.StatusCreated, slot)
}

func (h *CommunicationHandler) GetMeetingSlots(c *gin.Context) {
	teacherID, err := uuid.Parse(c.Param("teacherID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid teacher ID"})
		return
	}
	slots, err := h.useCase.GetMeetingSlotsByTeacher(c.Request.Context(), teacherID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch meeting slots"})
		return
	}
	c.JSON(http.StatusOK, slots)
}

func (h *CommunicationHandler) BookMeeting(c *gin.Context) {
	var booking domain.MeetingBooking
	if err := c.ShouldBindJSON(&booking); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}
	if err := h.useCase.BookMeeting(c.Request.Context(), &booking); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to book meeting"})
		return
	}
	c.JSON(http.StatusCreated, booking)
}

func (h *CommunicationHandler) GetBookingsByGuardian(c *gin.Context) {
	guardianID, err := uuid.Parse(c.Param("guardianID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid guardian ID"})
		return
	}
	bookings, err := h.useCase.GetBookingsByGuardian(c.Request.Context(), guardianID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch bookings"})
		return
	}
	c.JSON(http.StatusOK, bookings)
}

func (h *CommunicationHandler) ReceiveWhatsAppWebhook(c *gin.Context) {
	// Accept JSON or form-data (Twilio uses form data, standard webhooks might use JSON)
	var payload map[string]interface{}
	if err := c.ShouldBind(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	if err := h.useCase.ReceiveWhatsAppWebhook(c.Request.Context(), payload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process webhook"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "received"})
}

func (h *CommunicationHandler) SendWhatsAppMessage(c *gin.Context) {
	var req struct {
		PhoneNumber string `json:"phone_number" binding:"required"`
		Content     string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	if err := h.useCase.SendWhatsAppMessage(c.Request.Context(), req.PhoneNumber, req.Content); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "sent"})
}

func (h *CommunicationHandler) GetWhatsAppMessages(c *gin.Context) {
	messages, err := h.useCase.GetWhatsAppMessages(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch messages"})
		return
	}
	c.JSON(http.StatusOK, messages)
}

func (h *CommunicationHandler) TriggerBirthdays(c *gin.Context) {
	count, err := h.useCase.SendBirthdayGreetings(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to trigger birthday greetings"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Birthday greetings sent successfully", "count": count})
}
