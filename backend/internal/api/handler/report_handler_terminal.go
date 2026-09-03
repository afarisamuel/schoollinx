package handler

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/pdf"
)

func (h *ReportHandler) GenerateTerminalReportHandler(c *gin.Context) {
	ctx := c.Request.Context()
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student ID"})
		return
	}

	periodIDStr := c.Query("period_id")
	termIDStr := c.Query("term_id")
	var periodID uuid.UUID
	var termID uuid.UUID
	var activePeriod *domain.AcademicPeriod

	if periodIDStr != "" && termIDStr != "" {
		periodID, err = uuid.Parse(periodIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid period_id"})
			return
		}
		termID, err = uuid.Parse(termIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid term_id"})
			return
		}
	} else {
		// Fallback to active period and term
		activePeriod, err = h.academicRepo.GetActive(ctx)
		if err != nil || activePeriod == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "period_id and term_id are required and no active period found"})
			return
		}
		periodID = activePeriod.ID
		// Just pick the active term from the period if possible
		if len(activePeriod.Terms) > 0 {
		    for _, t := range activePeriod.Terms {
		        if t.TermNumber == activePeriod.CurrentTerm {
		            termID = t.ID
		            break
		        }
		    }
		    if termID == uuid.Nil {
		        termID = activePeriod.Terms[0].ID
		    }
		} else {
		    c.JSON(http.StatusBadRequest, gin.H{"error": "active period has no terms"})
		    return
		}
	}

	tenantID := ctx.Value(middleware.TenantIDKey).(uuid.UUID)
	tenant, err := h.tenantRepo.GetByID(ctx, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load tenant info"})
		return
	}

	student, err := h.studentRepo.GetByID(ctx, studentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "student not found"})
		return
	}

	grades, err := h.gradeRepo.GetByStudentID(ctx, studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch grades"})
		return
	}

	// Resolve subject IDs / UUIDs to real human-readable Subject Names
	if h.subjectRepo != nil {
		allSubjects, _ := h.subjectRepo.GetAll(ctx)
		subjectNameMap := make(map[string]string)
		for _, s := range allSubjects {
			subjectNameMap[s.ID.String()] = s.Name
			if s.Code != "" {
				subjectNameMap[s.Code] = s.Name
			}
			subjectNameMap[s.Name] = s.Name
		}

		for i := range grades {
			subjKey := grades[i].Subject
			if realName, ok := subjectNameMap[subjKey]; ok && realName != "" {
				grades[i].Subject = realName
			} else if u, err := uuid.Parse(subjKey); err == nil {
				if sub, err := h.subjectRepo.GetByID(ctx, u); err == nil && sub != nil && sub.Name != "" {
					grades[i].Subject = sub.Name
					subjectNameMap[subjKey] = sub.Name
				}
			}
		}
	}

	eval, _ := h.evalRepo.GetByStudentAndTerm(ctx, studentID, periodID, termID)

	// Look up the class teacher for this student
	var classTeacher *domain.Teacher
	classSize := 1
	if student.ClassID != nil {
		class, err := h.classRepo.GetByID(ctx, *student.ClassID)
		if err == nil && class != nil && class.TeacherID != nil {
			classTeacher, _ = h.teacherRepo.GetByID(ctx, *class.TeacherID)
		}
		if classStudents, err := h.studentRepo.GetByClass(ctx, *student.ClassID); err == nil && len(classStudents) > 0 {
			classSize = len(classStudents)
		}
	}

	// Calculate real student attendance stats
	attendance := map[string]int{"present": 0, "absent": 0, "tardy": 0}
	if h.attendanceRepo != nil {
		if records, err := h.attendanceRepo.GetByStudent(ctx, studentID); err == nil && len(records) > 0 {
			for _, rec := range records {
				if rec.Status == domain.StatusPresent {
					attendance["present"]++
				} else if rec.Status == domain.StatusAbsent {
					attendance["absent"]++
				} else if rec.Status == domain.StatusTardy {
					attendance["tardy"]++
				}
			}
		}
	}

	// If activePeriod is nil (periodID was passed as query param), fetch it
	if activePeriod == nil && periodID != uuid.Nil {
		activePeriod, _ = h.academicRepo.GetByID(ctx, periodID)
	}

	// Resolve actual Term Name, Academic Year, and Next Term Resumption Date
	termLabel := "Term 1"
	academicYearLabel := ""
	nextTermBegins := "To be communicated"
	totalTermsInPeriod := 3

	if activePeriod != nil {
		academicYearLabel = activePeriod.Name
		if activePeriod.TermCount > 0 {
			totalTermsInPeriod = activePeriod.TermCount
		}

		if len(activePeriod.Terms) > 0 {
			for _, t := range activePeriod.Terms {
				if t.ID == termID || (termID == uuid.Nil && t.TermNumber == activePeriod.CurrentTerm) {
					termLabel = t.Name
					if termLabel == "" {
						termLabel = fmt.Sprintf("Term %d", t.TermNumber)
					}
					if !t.EndDate.IsZero() {
						nextTermBegins = t.EndDate.AddDate(0, 0, 14).Format("02 Jan 2006")
					}
					break
				}
			}
		} else if activePeriod.CurrentTerm > 0 {
			termLabel = fmt.Sprintf("Term %d", activePeriod.CurrentTerm)
		}
	}

	// Resolve promotion status conditionally
	promotedTo := "N/A (Term Ongoing)"
	if activePeriod != nil && activePeriod.CurrentTerm >= totalTermsInPeriod {
		promotedTo = fmt.Sprintf("Level %d", student.Level+1)
	}

	data := pdf.TerminalReportData{
		Student:        student,
		Tenant:         tenant,
		ClassTeacher:   classTeacher,
		Grades:         grades,
		Evaluation:     eval,
		Attendance:     attendance,
		Term:           termLabel,
		AcademicYear:   academicYearLabel,
		ClassSize:      classSize,
		NextTermBegins: nextTermBegins,
		PromotedTo:     promotedTo,
	}

	c.Header("Content-Type", "application/pdf")
	filename := fmt.Sprintf("Terminal_Report_%s.pdf", studentID.String())
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	if err := h.pdfService.GenerateTerminalReport(c.Writer, data); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate terminal report"})
		return
	}
}

// GenerateReportRemarks produces context-aware automated terminal report remarks.
func (h *ReportHandler) GenerateReportRemarks(c *gin.Context) {
	ctx := c.Request.Context()
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student ID"})
		return
	}

	student, err := h.studentRepo.GetByID(ctx, studentID)
	if err != nil || student == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "student not found"})
		return
	}

	grades, _ := h.gradeRepo.GetByStudentID(ctx, studentID)
	var totalScore float64
	var count int
	for _, g := range grades {
		totalScore += float64(g.Score)
		count++
	}

	avgScore := 0.0
	if count > 0 {
		avgScore = totalScore / float64(count)
	}

	formMasterRemark := ""
	principalRemark := ""
	conductSummary := "Well-mannered, respectful, and observant of campus regulations."

	firstName := student.FirstName
	if firstName == "" {
		firstName = "The student"
	}

	if avgScore >= 80 {
		formMasterRemark = fmt.Sprintf("%s has maintained an outstanding academic standard this term with sharp analytical comprehension across all subjects. Keep aiming for the pinnacle.", firstName)
		principalRemark = "A distinguished academic performance. Commended for scholastic excellence and exemplary diligence."
		conductSummary = "Exemplary conduct, polite demeanor, and a positive influence on peers."
	} else if avgScore >= 65 {
		formMasterRemark = fmt.Sprintf("%s has shown commendable effort and steady progress this term. Further focus on revision in core subjects will yield even higher honors.", firstName)
		principalRemark = "Good overall performance with strong potential. Encouraged to sustain this momentum into the next academic term."
	} else if avgScore >= 50 {
		formMasterRemark = fmt.Sprintf("%s is capable of better results with dedicated classroom participation and prompt submission of assignments.", firstName)
		principalRemark = "Satisfactory progress, but there is significant room for improvement. Regular study sessions are advised."
	} else {
		formMasterRemark = fmt.Sprintf("%s struggled in core conceptual assessments this term. Intensive remedial support and closer parental supervision are strongly recommended.", firstName)
		principalRemark = "Below expectations. Requires immediate academic intervention and structured after-school tutoring."
	}

	c.JSON(http.StatusOK, gin.H{
		"student_id":         studentID,
		"student_name":       fmt.Sprintf("%s %s", student.FirstName, student.LastName),
		"average_score":      avgScore,
		"subject_count":      count,
		"form_master_remark": formMasterRemark,
		"principal_remark":   principalRemark,
		"conduct_summary":    conductSummary,
	})
}
