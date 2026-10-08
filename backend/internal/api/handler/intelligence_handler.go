package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
)

type IntelligenceHandler struct {
	intelligenceUseCase domain.IntelligenceUseCase
}

func NewIntelligenceHandler(r *gin.RouterGroup, iuc domain.IntelligenceUseCase) {
	h := &IntelligenceHandler{
		intelligenceUseCase: iuc,
	}

	api := r.Group("/intelligence")
	{
		// Institutional KPIs and AI Chatbot visible to Admins and Teachers
		api.GET("/kpis", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleTeacher), h.GetKPIs)
		api.POST("/chat", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleTeacher), h.ChatWithAI)

		// Advanced predictive analytics strictly restricted to ADMIN
		adminGroup := api.Group("")
		adminGroup.Use(middleware.RoleMiddleware(domain.RoleAdmin))
		{
			adminGroup.GET("/predictions/retention", h.GetRetentionRisks)
			adminGroup.GET("/predictions/demand", h.GetCourseDemand)
			adminGroup.GET("/export", h.ExportExecutiveSummary)
			adminGroup.POST("/interventions/generate", h.GenerateInterventions)
			adminGroup.GET("/at-risk-students", h.GetAtRiskStudents)
			adminGroup.POST("/natural-query", h.NaturalLanguageQuery)
		}
	}
}

func (h *IntelligenceHandler) GetAtRiskStudents(c *gin.Context) {
	students, err := h.intelligenceUseCase.GetAtRiskStudents(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to analyze at-risk students"})
		return
	}
	c.JSON(http.StatusOK, students)
}

func (h *IntelligenceHandler) GetKPIs(c *gin.Context) {
	kpis, err := h.intelligenceUseCase.GetDashboardMetadata(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to aggregate institutional KPIs"})
		return
	}

	c.JSON(http.StatusOK, kpis)
}

func (h *IntelligenceHandler) GetRetentionRisks(c *gin.Context) {
	risks, err := h.intelligenceUseCase.AnalyzeRetentionRisk(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to compute retention risks"})
		return
	}

	c.JSON(http.StatusOK, risks)
}

func (h *IntelligenceHandler) GetCourseDemand(c *gin.Context) {
	demands, err := h.intelligenceUseCase.ForecastCourseDemand(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to forecast course demand"})
		return
	}

	c.JSON(http.StatusOK, demands)
}

func (h *IntelligenceHandler) ExportExecutiveSummary(c *gin.Context) {
	csvData, err := h.intelligenceUseCase.GenerateExecutiveReportCSV(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate executive CSV export"})
		return
	}

	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=executive_summary.csv")
	c.Data(http.StatusOK, "text/csv", bytes.NewBuffer(csvData).Bytes())
}

func (h *IntelligenceHandler) GenerateInterventions(c *gin.Context) {
	if err := h.intelligenceUseCase.GenerateInterventions(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate interventions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Interventions generated and alerts dispatched successfully"})
}

// NaturalLanguageQuery accepts plain-text administrator questions and synthesizes structured insight answers (Gap #50).
func (h *IntelligenceHandler) NaturalLanguageQuery(c *gin.Context) {
	h.ChatWithAI(c)
}

// AIChatRequest defines the inbound chat payload.
type AIChatRequest struct {
	Prompt           string          `json:"prompt"`
	Messages         []AIChatMsgItem `json:"messages"`
	ActiveRoute      string          `json:"active_route"`
	AttachmentBase64 string          `json:"attachment_base64"`
	AttachmentMime   string          `json:"attachment_mime"`
}

type AIChatMsgItem struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type AIChatAction struct {
	Type    string      `json:"type"`
	Label   string      `json:"label"`
	Route   string      `json:"route,omitempty"`
	Payload interface{} `json:"payload,omitempty"`
}

// ChatWithAI handles conversational school intelligence requests using Google Gemini 2.5 Flash
// with live RAG institutional data grounding, multi-modal vision parsing, and action extraction.
func (h *IntelligenceHandler) ChatWithAI(c *gin.Context) {
	var req AIChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: " + err.Error()})
		return
	}

	prompt := strings.TrimSpace(req.Prompt)
	if prompt == "" && len(req.Messages) > 0 {
		lastMsg := req.Messages[len(req.Messages)-1]
		if lastMsg.Role == "user" {
			prompt = lastMsg.Content
		}
	}
	if prompt == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Prompt cannot be empty"})
		return
	}

	// 1. Fetch Real-time Institutional Grounding Data (RAG context)
	kpis, _ := h.intelligenceUseCase.GetDashboardMetadata(c.Request.Context())
	atRisk, _ := h.intelligenceUseCase.GetAtRiskStudents(c.Request.Context())

	totalStudents := int64(0)
	totalTeachers := int64(0)
	avgGPA := 0.0
	avgAttendance := 0.0
	totalRevenue := 0.0
	acadYear := "2026/2027"
	term := "Term 1"
	if kpis != nil {
		totalStudents = kpis.TotalStudents
		totalTeachers = kpis.TotalTeachers
		avgGPA = kpis.AverageGPA
		avgAttendance = kpis.AverageAttendance
		totalRevenue = kpis.TotalRevenue
		if kpis.ActiveAcademicYear != "" {
			acadYear = kpis.ActiveAcademicYear
		}
		if kpis.ActiveTerm != "" {
			term = kpis.ActiveTerm
		}
	}

	// 2. Call Google Gemini Flash API if Key is Available
	geminiKey := os.Getenv("GEMINI_API_KEY")

	var aiContent string
	var aiAction *AIChatAction
	suggestedPrompts := []string{"Show at-risk students", "What is the fee collection rate?", "Help me draft a lesson plan"}

	if geminiKey != "" {
		systemInstruction := fmt.Sprintf(`You are SchoolLinx Intelligence, the premier institutional AI Copilot & Pedagogical Assistant designed for school administrators, principals, and educators.

Live School Database Grounding Snapshot:
- Active Academic Year / Term: %s (%s)
- Total Enrolled Students: %d
- Total Faculty & Staff: %d
- Average Attendance Rate: %.1f%%
- School-Wide Average GPA / Score: %.2f
- Early-Warning At-Risk Retention Watchlist: %d students
- Total Revenue Collected to Date: GH₵ %.2f
- User Current Active Screen: %s

Capabilities & Specialized Modes:
1. **School Administration & Real-Time Data**: Answer questions about enrollment, fee arrears, daily attendance, retention risk, and institutional workflows accurately using the live data above.
2. **Pedagogy & Lesson Planning**: If asked to draft a lesson plan, follow standard structured instructional frameworks (Topic, Grade Level, Objectives based on Bloom's Taxonomy, Teaching Materials, Introduction, Main Activities, Assessment, and Conclusion).
3. **Assessment & Quiz Generation**: When asked to create tests or quizzes, provide clear questions (Multiple Choice or Short Answer) complete with answer keys and scoring rubrics.
4. **Student Report Card Remarks**: When asked to write report remarks, generate thoughtful, constructive, and motivating comments tailored to the student's performance level.
5. **Parent & Community Communications**: When drafting SMS or broadcast notices, keep messages concise, professional, and within standard SMS limits (or provide full letter format if requested).
6. **Navigation & Action Suggestions**: If the query relates to an institutional portal (e.g. Admission Form, Financial Ledger, Gradebook, ID Badges, Timetable, or At-Risk Analytics), naturally mention where to find it.

Formatting Guidelines:
- Use clean GitHub-style Markdown with bolding, bullet points, numbered lists, and Markdown tables for comparisons and summaries.
- Keep answers clear, structured, and easy to read.
`, acadYear, term, totalStudents, totalTeachers, avgAttendance, avgGPA, len(atRisk), totalRevenue, req.ActiveRoute)

		geminiResp, err := callGeminiChat(c.Request.Context(), geminiKey, systemInstruction, req.Messages, prompt, req.AttachmentBase64, req.AttachmentMime)
		if err == nil && geminiResp != "" {
			aiContent = geminiResp
		}
	}

	// Fallback if AI provider is unreachable
	if aiContent == "" {
		lower := strings.ToLower(prompt)
		switch {
		case strings.Contains(lower, "at-risk") || strings.Contains(lower, "at risk") || strings.Contains(lower, "dropout"):
			aiContent = fmt.Sprintf("Found **%d students** in the early-warning retention watchlist.\n\nRecommended actions:\n- Review individual attendance logs\n- Dispatch guardian consultation letters\n- Verify fee payment schedules", len(atRisk))
			aiAction = &AIChatAction{
				Type:  "NAVIGATE",
				Label: "Open Retention Risk Watchlist",
				Route: "/analytics/at-risk",
			}
			suggestedPrompts = []string{"Export at-risk list to CSV", "Draft parent meeting letter", "Show attendance stats"}
		case strings.Contains(lower, "admission") || strings.Contains(lower, "enroll"):
			aiContent = "You can admit new students directly via the **Student Enrollment Wizard** or print the official **Paper Admission Form** with optical handwritten OCR scanning."
			aiAction = &AIChatAction{
				Type:  "NAVIGATE",
				Label: "Open Admission Form",
				Route: "/students/admission-form",
			}
			suggestedPrompts = []string{"Scan handwritten form", "View students directory", "Show class capacity"}
		case strings.Contains(lower, "fee") || strings.Contains(lower, "revenue") || strings.Contains(lower, "financial") || strings.Contains(lower, "balance"):
			aiContent = fmt.Sprintf("### Financial Ledger Snapshot\n\n- **Total Revenue Collected:** GH₵ %.2f\n- **Active Session:** %s %s\n\nTo view fee structures, debtor aging, or thermal receipt printer logs, open the Financial Management Portal.", totalRevenue, acadYear, term)
			aiAction = &AIChatAction{
				Type:  "NAVIGATE",
				Label: "Go to Financial Ledger",
				Route: "/fiscal",
			}
			suggestedPrompts = []string{"Configure fee structures", "Show defaulters list", "Export revenue summary"}
		case strings.Contains(lower, "attendance"):
			aiContent = fmt.Sprintf("The school-wide attendance rate is currently **%.1f%%**.\n\nDaily attendance can be captured via barcode scans, teacher mobile check-ins, or biometric roll-call.", avgAttendance)
			aiAction = &AIChatAction{
				Type:  "NAVIGATE",
				Label: "Open Attendance Tracker",
				Route: "/attendance/mark",
			}
			suggestedPrompts = []string{"Show chronic absentees", "Daily attendance logs", "Open Barcode Scanner"}
		case strings.Contains(lower, "lesson"):
			aiContent = "### Standard Lesson Plan Outline\n\n- **Topic:** Selected Curriculum Module\n- **Objectives:** Recall, understand, and apply core concepts\n- **Activities:** Direct instruction, group exploration, and formative check\n- **Assessment:** 3-question exit ticket\n\nOpen the **Lesson Planner** to build and publish full schemes of work."
			aiAction = &AIChatAction{
				Type:  "NAVIGATE",
				Label: "Open Lesson Planner",
				Route: "/teachers/lessons",
			}
			suggestedPrompts = []string{"Draft 5-question math quiz", "Write student report remark", "Create science lesson plan"}
		default:
			aiContent = fmt.Sprintf("Based on live institutional records, **SchoolLinx** currently tracks **%d enrolled students** and **%d faculty members** for **%s (%s)** with an overall attendance rate of **%.1f%%**.", totalStudents, totalTeachers, acadYear, term, avgAttendance)
			suggestedPrompts = []string{"Show at-risk students", "Daily attendance rate", "How to print admission form"}
		}
	}

	// Dynamic Action Recognition based on AI text or prompt
	if aiAction == nil {
		lower := strings.ToLower(prompt + " " + aiContent)
		if strings.Contains(lower, "admission form") || strings.Contains(lower, "print admission") {
			aiAction = &AIChatAction{Type: "NAVIGATE", Label: "Open Admission Form", Route: "/students/admission-form"}
		} else if strings.Contains(lower, "student directory") || strings.Contains(lower, "view students") || strings.Contains(lower, "enrolled students") {
			aiAction = &AIChatAction{Type: "NAVIGATE", Label: "View Students Directory", Route: "/students"}
		} else if strings.Contains(lower, "id card") || strings.Contains(lower, "badging") {
			aiAction = &AIChatAction{Type: "NAVIGATE", Label: "Open ID Card Studio", Route: "/students/id-cards"}
		} else if strings.Contains(lower, "fee") || strings.Contains(lower, "debtor") || strings.Contains(lower, "ledger") || strings.Contains(lower, "revenue") {
			aiAction = &AIChatAction{Type: "NAVIGATE", Label: "View Financial Ledger", Route: "/fiscal"}
		} else if strings.Contains(lower, "at risk") || strings.Contains(lower, "at-risk") {
			aiAction = &AIChatAction{Type: "NAVIGATE", Label: "Open Retention Risk Watchlist", Route: "/analytics/at-risk"}
		} else if strings.Contains(lower, "lesson plan") || strings.Contains(lower, "scheme of work") {
			aiAction = &AIChatAction{Type: "NAVIGATE", Label: "Open Lesson Planner", Route: "/teachers/lessons"}
		} else if strings.Contains(lower, "cbt") || strings.Contains(lower, "quiz") || strings.Contains(lower, "exam") {
			aiAction = &AIChatAction{Type: "NAVIGATE", Label: "Open CBT Assessment Builder", Route: "/teachers/cbt-builder"}
		} else if strings.Contains(lower, "timetable") || strings.Contains(lower, "schedule") {
			aiAction = &AIChatAction{Type: "NAVIGATE", Label: "Open Timetable Manager", Route: "/timetables"}
		} else if strings.Contains(lower, "broadcast") || strings.Contains(lower, "sms") || strings.Contains(lower, "message") {
			aiAction = &AIChatAction{Type: "NAVIGATE", Label: "Open Messaging Hub", Route: "/communications/messages"}
		}
	}

	var actionsList []AIChatAction
	if aiAction != nil {
		actionsList = append(actionsList, *aiAction)
	}

	c.JSON(http.StatusOK, gin.H{
		"content":           aiContent,
		"reply":             aiContent,
		"answer":            aiContent,
		"type":              "text",
		"action":            aiAction,
		"actions":           actionsList,
		"suggested_prompts": suggestedPrompts,
		"timestamp":         time.Now(),
		"kpis": gin.H{
			"total_students":     totalStudents,
			"total_teachers":     totalTeachers,
			"average_attendance": avgAttendance,
			"average_gpa":        avgGPA,
			"at_risk_count":      len(atRisk),
			"total_revenue":      totalRevenue,
		},
	})
}

// callGeminiChat performs a Gemini 2.5 Flash query with multi-turn history and optional image attachment.
func callGeminiChat(ctx context.Context, apiKey string, systemInstruction string, history []AIChatMsgItem, currentPrompt string, attachmentBase64 string, attachmentMime string) (string, error) {
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=%s", apiKey)

	var contents []map[string]interface{}

	// Append prior history (capped to last 8 turns for token efficiency)
	startIndex := 0
	if len(history) > 8 {
		startIndex = len(history) - 8
	}

	for i := startIndex; i < len(history); i++ {
		h := history[i]
		role := "user"
		if h.Role == "assistant" {
			role = "model"
		}
		contents = append(contents, map[string]interface{}{
			"role": role,
			"parts": []map[string]interface{}{
				{"text": h.Content},
			},
		})
	}

	// Build current prompt part
	var currentParts []map[string]interface{}
	if attachmentBase64 != "" {
		if attachmentMime == "" {
			attachmentMime = "image/jpeg"
		}
		currentParts = append(currentParts, map[string]interface{}{
			"inlineData": map[string]interface{}{
				"mimeType": attachmentMime,
				"data":     attachmentBase64,
			},
		})
	}
	currentParts = append(currentParts, map[string]interface{}{
		"text": currentPrompt,
	})

	contents = append(contents, map[string]interface{}{
		"role":  "user",
		"parts": currentParts,
	})

	payload := map[string]interface{}{
		"contents": contents,
		"systemInstruction": map[string]interface{}{
			"parts": []map[string]interface{}{
				{"text": systemInstruction},
			},
		},
		"generationConfig": map[string]interface{}{
			"temperature":     0.4,
			"maxOutputTokens": 2048,
		},
	}

	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonBytes))
	if err != nil {
		return "", err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("gemini api error (HTTP %d): %s", resp.StatusCode, string(bodyBytes))
	}

	var geminiResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	if err := json.Unmarshal(bodyBytes, &geminiResp); err != nil {
		return "", err
	}

	if len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
		return strings.TrimSpace(geminiResp.Candidates[0].Content.Parts[0].Text), nil
	}

	return "", fmt.Errorf("empty candidate in gemini response")
}
