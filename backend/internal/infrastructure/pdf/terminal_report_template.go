package pdf

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/jung-kurt/gofpdf"
	"github.com/user/high-school-management/backend/internal/domain"
)

// TerminalReportData holds all necessary info to generate the terminal report
type TerminalReportData struct {
	Student          *domain.Student
	Tenant           *domain.Tenant
	ClassTeacher     *domain.Teacher
	Grades           []domain.Grade
	Evaluation       *domain.TerminalEvaluation
	Attendance       map[string]int
	Term             string
	AcademicYear     string
	NextTermBegins   string
	PromotedTo       string
	ClassSize        int
	PositionInClass  string
	SubjectPositions map[string]string // map[subjectName]position, e.g. "Mathematics" -> "1st"
}

func (s *PDFService) drawTerminalReport(pdf *gofpdf.Fpdf, data TerminalReportData) {
	// Add watermark first so it stays in the background
	if data.Tenant != nil && data.Tenant.LogoURL != "" {
		s.drawWatermark(pdf, data.Tenant.LogoURL)
	}

	// ── 1. Top Decorative Bars ────────────────────────────────────────────────
	pdf.SetFillColor(30, 41, 59) // Slate 800
	pdf.Rect(0, 0, 210, 3.5, "F")
	pdf.SetFillColor(79, 70, 229) // Indigo 600
	pdf.Rect(0, 3.5, 210, 1.0, "F")

	// ── 2. Executive Header (School Crest, Branding, Student Photo) ───────────
	tenantName := "ACADEMIC INSTITUTION"
	if data.Tenant != nil && data.Tenant.Name != "" {
		tenantName = strings.ToUpper(data.Tenant.Name)
	}

	// Left: School Crest / Logo
	logoURL := ""
	if data.Tenant != nil && data.Tenant.LogoURL != "" {
		logoURL = data.Tenant.LogoURL
	}
	s.drawImage(pdf, logoURL, "report_school_logo", 10, 7.5, 23, 23, "CREST", true)

	// Right: Student Passport Photo
	photoURL := ""
	studentPhotoKey := "report_student_photo"
	if data.Student != nil {
		photoURL = data.Student.PhotoURL
		studentPhotoKey = fmt.Sprintf("report_photo_%s", data.Student.ID.String())
	}
	s.drawImage(pdf, photoURL, studentPhotoKey, 177, 7.5, 23, 23, "PHOTO", true)

	// Center: School Info
	pdf.SetY(7.5)
	pdf.SetX(35)
	pdf.SetTextColor(15, 23, 42) // Slate 900
	pdf.SetFont("Arial", "B", 15)
	pdf.CellFormat(140, 6.5, tenantName, "", 1, "C", false, 0, "")

	if data.Tenant != nil && data.Tenant.Motto != "" {
		pdf.SetX(35)
		pdf.SetTextColor(79, 70, 229) // Indigo 600
		pdf.SetFont("Arial", "I", 8)
		pdf.CellFormat(140, 4.2, fmt.Sprintf(`"%s"`, data.Tenant.Motto), "", 1, "C", false, 0, "")
	}

	contactParts := []string{}
	if data.Tenant != nil {
		if data.Tenant.Address != "" {
			contactParts = append(contactParts, data.Tenant.Address)
		}
		if data.Tenant.ContactNumbers != "" {
			contactParts = append(contactParts, "Tel: "+data.Tenant.ContactNumbers)
		}
		if data.Tenant.Email != "" {
			contactParts = append(contactParts, "Email: "+data.Tenant.Email)
		}
	}
	contactLine := strings.Join(contactParts, "  •  ")
	if contactLine == "" {
		contactLine = "Official Institutional Academic & Terminal Assessment Record"
	}
	pdf.SetX(35)
	pdf.SetTextColor(100, 116, 139) // Slate 500
	pdf.SetFont("Arial", "", 7.5)
	pdf.CellFormat(140, 4.2, contactLine, "", 1, "C", false, 0, "")

	// ── 3. Document Title Banner ──────────────────────────────────────────────
	pdf.SetY(32)
	pdf.SetFillColor(30, 41, 59) // Slate 800
	pdf.RoundedRect(10, 32, 190, 7.5, 2, "1234", "F")
	pdf.SetFont("Arial", "B", 10.5)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetXY(10, 32)
	bannerTitle := "TERMINAL ACADEMIC PROGRESS REPORT"
	if data.Term != "" {
		bannerTitle = fmt.Sprintf("TERMINAL ACADEMIC REPORT — %s", strings.ToUpper(data.Term))
	}
	pdf.CellFormat(190, 7.5, bannerTitle, "", 0, "C", false, 0, "")

	// ── 4. Student Particulars Card ───────────────────────────────────────────
	studentName := "N/A"
	studentID := "N/A"
	className := "General"
	if data.Student != nil {
		studentName = fmt.Sprintf("%s %s", string(data.Student.FirstName), string(data.Student.LastName))
		if data.Student.EnrollmentNum != "" {
			studentID = data.Student.EnrollmentNum
		}
		if data.Student.Class != nil && data.Student.Class.Name != "" {
			className = data.Student.Class.Name
		} else if data.Student.Level > 0 {
			className = fmt.Sprintf("Level %d", data.Student.Level)
		}
	}

	termName := data.Term
	if termName == "" {
		termName = "Term 1"
	}
	academicYear := data.AcademicYear
	if academicYear == "" && data.Student != nil {
		academicYear = data.Student.AcademicYear
	}
	if academicYear == "" {
		academicYear = "N/A"
	}

	classSizeStr := strconv.Itoa(data.ClassSize)
	if data.ClassSize <= 0 {
		classSizeStr = "-"
	}

	posStr := data.PositionInClass
	if posStr == "" {
		posStr = "-"
	}

	presentDays := 0
	totalDays := 0
	if data.Attendance != nil {
		presentDays = data.Attendance["present"]
		totalDays = data.Attendance["present"] + data.Attendance["absent"]
	}
	attendanceStr := fmt.Sprintf("%d / %d Days", presentDays, totalDays)
	if totalDays == 0 {
		attendanceStr = fmt.Sprintf("%d Days (Regular)", presentDays)
	}

	cardY := 41.5
	pdf.SetFillColor(248, 250, 252) // Slate 50
	pdf.SetDrawColor(226, 232, 240) // Slate 200
	pdf.SetLineWidth(0.3)
	pdf.RoundedRect(10, cardY, 190, 19, 2, "1234", "FD")

	// Row 1
	pdf.SetXY(14, cardY+2)
	pdf.SetFont("Arial", "B", 7)
	pdf.SetTextColor(100, 116, 139)
	pdf.Cell(24, 4, "STUDENT NAME:")
	pdf.SetFont("Arial", "B", 8.5)
	pdf.SetTextColor(15, 23, 42)
	pdf.Cell(48, 4, studentName)

	pdf.SetXY(88, cardY+2)
	pdf.SetFont("Arial", "B", 7)
	pdf.SetTextColor(100, 116, 139)
	pdf.Cell(18, 4, "CLASS / FORM:")
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(15, 23, 42)
	pdf.Cell(30, 4, className)

	pdf.SetXY(140, cardY+2)
	pdf.SetFont("Arial", "B", 7)
	pdf.SetTextColor(100, 116, 139)
	pdf.Cell(20, 4, "ACADEMIC YR:")
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(15, 23, 42)
	pdf.Cell(30, 4, academicYear)

	// Row 2
	pdf.SetXY(14, cardY+6.8)
	pdf.SetFont("Arial", "B", 7)
	pdf.SetTextColor(100, 116, 139)
	pdf.Cell(24, 4, "STUDENT ID:")
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(79, 70, 229) // Indigo
	pdf.Cell(48, 4, studentID)

	pdf.SetXY(88, cardY+6.8)
	pdf.SetFont("Arial", "B", 7)
	pdf.SetTextColor(100, 116, 139)
	pdf.Cell(18, 4, "CLASS SIZE:")
	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(15, 23, 42)
	pdf.Cell(30, 4, classSizeStr+" Pupils")

	pdf.SetXY(140, cardY+6.8)
	pdf.SetFont("Arial", "B", 7)
	pdf.SetTextColor(100, 116, 139)
	pdf.Cell(20, 4, "TERM:")
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(79, 70, 229)
	pdf.Cell(30, 4, termName)

	// Row 3
	pdf.SetXY(14, cardY+11.6)
	pdf.SetFont("Arial", "B", 7)
	pdf.SetTextColor(100, 116, 139)
	pdf.Cell(24, 4, "ATTENDANCE:")
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(16, 185, 129) // Emerald
	pdf.Cell(48, 4, attendanceStr)

	pdf.SetXY(88, cardY+11.6)
	pdf.SetFont("Arial", "B", 7)
	pdf.SetTextColor(100, 116, 139)
	pdf.Cell(18, 4, "POSITION:")
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(79, 70, 229)
	pdf.Cell(30, 4, posStr)

	pdf.SetXY(140, cardY+11.6)
	pdf.SetFont("Arial", "B", 7)
	pdf.SetTextColor(100, 116, 139)
	pdf.Cell(20, 4, "PROMOTION:")
	pdf.SetFont("Arial", "B", 7.5)
	pdf.SetTextColor(15, 23, 42)
	promStatus := data.PromotedTo
	if promStatus == "" {
		promStatus = "Ongoing Term"
	}
	pdf.Cell(30, 4, promStatus)

	// ── 5. Academic Performance Matrix (Grades Table) ─────────────────────────
	tableY := 63.0
	pdf.SetY(tableY)

	cw := float32(0.5)
	ew := float32(0.5)
	if data.Tenant != nil {
		if data.Tenant.ClassScoreWeight > 0 || data.Tenant.ExamScoreWeight > 0 {
			cw = data.Tenant.ClassScoreWeight
			ew = data.Tenant.ExamScoreWeight
		}
	}

	classScoreHeader := fmt.Sprintf("CLASS (%.0f%%)", cw*100)
	examScoreHeader := fmt.Sprintf("EXAM (%.0f%%)", ew*100)

	// Column Widths (Sum = 190mm)
	colNum := 8.0
	colSubj := 48.0
	colClass := 24.0
	colExam := 24.0
	colTot := 20.0
	colGrd := 14.0
	colPos := 16.0
	colRem := 36.0

	pdf.SetFillColor(30, 41, 59) // Slate 800
	pdf.SetDrawColor(30, 41, 59)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 7.5)

	pdf.CellFormat(colNum, 6.5, "#", "1", 0, "C", true, 0, "")
	pdf.CellFormat(colSubj, 6.5, "SUBJECT / LEARNING AREA", "1", 0, "L", true, 0, "")
	pdf.CellFormat(colClass, 6.5, classScoreHeader, "1", 0, "C", true, 0, "")
	pdf.CellFormat(colExam, 6.5, examScoreHeader, "1", 0, "C", true, 0, "")
	pdf.CellFormat(colTot, 6.5, "TOTAL", "1", 0, "C", true, 0, "")
	pdf.CellFormat(colGrd, 6.5, "GRADE", "1", 0, "C", true, 0, "")
	pdf.CellFormat(colPos, 6.5, "POS", "1", 0, "C", true, 0, "")
	pdf.CellFormat(colRem, 6.5, "REMARK", "1", 1, "L", true, 0, "")

	type subjectGrade struct {
		Class float32
		Exam  float32
		Total float32
	}
	subjectMap := make(map[string]*subjectGrade)
	var subjectOrder []string

	for _, g := range data.Grades {
		if _, ok := subjectMap[g.Subject]; !ok {
			subjectMap[g.Subject] = &subjectGrade{}
			subjectOrder = append(subjectOrder, g.Subject)
		}
		if g.Category == domain.CategoryFinal {
			subjectMap[g.Subject].Exam += g.Value
		} else {
			subjectMap[g.Subject].Class += g.Value
		}
	}

	var overallTotal float32 = 0
	var subjectCount float32 = 0

	pdf.SetFont("Arial", "", 8)
	pdf.SetDrawColor(226, 232, 240) // Slate 200

	for i, subject := range subjectOrder {
		sg := subjectMap[subject]
		if i%2 == 0 {
			pdf.SetFillColor(255, 255, 255)
		} else {
			pdf.SetFillColor(248, 250, 252) // Slate 50
		}

		sg.Total = (sg.Class * cw) + (sg.Exam * ew)
		overallTotal += sg.Total
		subjectCount++

		gradeLetter, remark := getGradeScale(sg.Total)

		pos := "-"
		if data.SubjectPositions != nil {
			if p, ok := data.SubjectPositions[subject]; ok && p != "" {
				pos = p
			}
		}

		pdf.SetTextColor(30, 41, 59)
		pdf.CellFormat(colNum, 5.5, fmt.Sprintf("%d", i+1), "1", 0, "C", true, 0, "")
		pdf.SetFont("Arial", "B", 8)
		pdf.CellFormat(colSubj, 5.5, "  "+subject, "1", 0, "L", true, 0, "")

		pdf.SetFont("Arial", "", 8)
		pdf.CellFormat(colClass, 5.5, fmt.Sprintf("%.1f", sg.Class), "1", 0, "C", true, 0, "")
		pdf.CellFormat(colExam, 5.5, fmt.Sprintf("%.1f", sg.Exam), "1", 0, "C", true, 0, "")

		pdf.SetFont("Arial", "B", 8)
		pdf.CellFormat(colTot, 5.5, fmt.Sprintf("%.1f", sg.Total), "1", 0, "C", true, 0, "")

		// Grade pill highlight
		if gradeLetter == "A" || gradeLetter == "B" {
			pdf.SetTextColor(16, 185, 129) // Emerald
		} else if gradeLetter == "F" {
			pdf.SetTextColor(239, 68, 68) // Rose
		} else {
			pdf.SetTextColor(79, 70, 229) // Indigo
		}
		pdf.CellFormat(colGrd, 5.5, gradeLetter, "1", 0, "C", true, 0, "")

		// Subject Position
		pdf.SetFont("Arial", "B", 7.5)
		pdf.SetTextColor(79, 70, 229) // Indigo
		pdf.CellFormat(colPos, 5.5, pos, "1", 0, "C", true, 0, "")

		pdf.SetTextColor(71, 85, 105)
		pdf.SetFont("Arial", "", 7.5)
		pdf.CellFormat(colRem, 5.5, "  "+remark, "1", 1, "L", true, 0, "")
	}

	// Overall Total & Average Summary Row
	pdf.SetFont("Arial", "B", 8)
	pdf.SetFillColor(241, 245, 249) // Slate 100
	pdf.SetTextColor(15, 23, 42)
	pdf.CellFormat(colNum+colSubj+colClass+colExam, 6.5, "OVERALL TOTAL & TERM AVERAGE:  ", "1", 0, "R", true, 0, "")

	pdf.SetTextColor(79, 70, 229)
	pdf.CellFormat(colTot, 6.5, fmt.Sprintf("%.1f", overallTotal), "1", 0, "C", true, 0, "")

	overallAvg := float32(0)
	if subjectCount > 0 {
		overallAvg = overallTotal / subjectCount
	}
	ovLetter, ovRemark := getGradeScale(overallAvg)
	pdf.CellFormat(colGrd, 6.5, ovLetter, "1", 0, "C", true, 0, "")
	pdf.SetFont("Arial", "B", 7)
	pdf.SetTextColor(79, 70, 229)
	pdf.CellFormat(colPos, 6.5, posStr, "1", 0, "C", true, 0, "")
	pdf.SetFont("Arial", "B", 7.5)
	pdf.SetTextColor(16, 185, 129)
	pdf.CellFormat(colRem, 6.5, fmt.Sprintf(" Avg: %.1f%% (%s)", overallAvg, ovRemark), "1", 1, "L", true, 0, "")

	pdf.Ln(2.5)

	// ── 6. Affective Domain & Behavioral Evaluation ───────────────────────────
	conduct, attitude, interest, cRemark, hRemark := "Satisfactory", "Positive", "Attentive", "", ""
	if data.Evaluation != nil {
		if data.Evaluation.Conduct != "" {
			conduct = data.Evaluation.Conduct
		}
		if data.Evaluation.Attitude != "" {
			attitude = data.Evaluation.Attitude
		}
		if data.Evaluation.Interest != "" {
			interest = data.Evaluation.Interest
		}
		cRemark = data.Evaluation.ClassTeacherRemark
		hRemark = data.Evaluation.HeadTeacherRemark
	}

	evalY := pdf.GetY()
	cardW := 60.5
	gap := 4.25

	// Conduct Box
	pdf.SetFillColor(248, 250, 252)
	pdf.SetDrawColor(226, 232, 240)
	pdf.RoundedRect(10, evalY, cardW, 11, 2, "1234", "FD")
	pdf.SetXY(13, evalY+1.5)
	pdf.SetFont("Arial", "B", 6.5)
	pdf.SetTextColor(100, 116, 139)
	pdf.Cell(cardW-6, 3.5, "CONDUCT & BEHAVIOR")
	pdf.SetXY(13, evalY+5.5)
	pdf.SetFont("Arial", "B", 7.5)
	pdf.SetTextColor(15, 23, 42)
	pdf.Cell(cardW-6, 4, conduct)

	// Attitude Box
	x2 := 10 + cardW + gap
	pdf.RoundedRect(x2, evalY, cardW, 11, 2, "1234", "FD")
	pdf.SetXY(x2+3, evalY+1.5)
	pdf.SetFont("Arial", "B", 6.5)
	pdf.SetTextColor(100, 116, 139)
	pdf.Cell(cardW-6, 3.5, "ATTITUDE & APPLICATION")
	pdf.SetXY(x2+3, evalY+5.5)
	pdf.SetFont("Arial", "B", 7.5)
	pdf.SetTextColor(15, 23, 42)
	pdf.Cell(cardW-6, 4, attitude)

	// Interest Box
	x3 := x2 + cardW + gap
	pdf.RoundedRect(x3, evalY, cardW, 11, 2, "1234", "FD")
	pdf.SetXY(x3+3, evalY+1.5)
	pdf.SetFont("Arial", "B", 6.5)
	pdf.SetTextColor(100, 116, 139)
	pdf.Cell(cardW-6, 3.5, "SPECIAL INTERESTS & ACTIVITIES")
	pdf.SetXY(x3+3, evalY+5.5)
	pdf.SetFont("Arial", "B", 7.5)
	pdf.SetTextColor(15, 23, 42)
	pdf.Cell(cardW-6, 4, interest)

	pdf.SetY(evalY + 14)

	// ── 7. Teacher & Principal Endorsements & Signatures ──────────────────────
	remY := pdf.GetY()
	remBoxW := 92.5
	remBoxH := 27.0

	// Class Teacher Remark Box (Left)
	pdf.SetFillColor(248, 250, 252)
	pdf.SetDrawColor(226, 232, 240)
	pdf.RoundedRect(10, remY, remBoxW, remBoxH, 2, "1234", "FD")
	// Left accent stripe in Indigo
	pdf.SetFillColor(79, 70, 229)
	pdf.Rect(10, remY, 2.0, remBoxH, "F")

	pdf.SetXY(14, remY+2)
	pdf.SetFont("Arial", "B", 7.5)
	pdf.SetTextColor(79, 70, 229)
	pdf.Cell(remBoxW-6, 4, "CLASS TEACHER'S APPRAISAL & REMARK")

	if cRemark == "" {
		cRemark = "Steady academic diligence and good overall participation throughout the term."
	}
	pdf.SetXY(14, remY+6.5)
	pdf.SetFont("Arial", "I", 7.5)
	pdf.SetTextColor(51, 65, 85)
	pdf.MultiCell(remBoxW-8, 3.6, cRemark, "", "L", false)

	// Class Teacher Signature
	teacherSigURL := ""
	if data.ClassTeacher != nil && data.ClassTeacher.SignatureURL != "" {
		teacherSigURL = data.ClassTeacher.SignatureURL
	}
	s.drawImage(pdf, teacherSigURL, "ct_sig_stamp", 14, remY+remBoxH-10, 28, 7, "", false)
	pdf.SetDrawColor(203, 213, 225)
	pdf.Line(14, remY+remBoxH-3.5, 95, remY+remBoxH-3.5)
	pdf.SetXY(14, remY+remBoxH-3.2)
	pdf.SetFont("Arial", "B", 6.5)
	pdf.SetTextColor(100, 116, 139)
	teacherTitle := "CLASS TEACHER SIGNATURE"
	if data.ClassTeacher != nil && data.ClassTeacher.FirstName != "" {
		teacherTitle = fmt.Sprintf("CLASS TEACHER (%s %s)", data.ClassTeacher.FirstName, data.ClassTeacher.LastName)
	}
	pdf.Cell(81, 3, teacherTitle)

	// Headmaster Remark Box (Right)
	pdf.SetFillColor(248, 250, 252)
	pdf.SetDrawColor(226, 232, 240)
	pdf.RoundedRect(107.5, remY, remBoxW, remBoxH, 2, "1234", "FD")
	// Left accent stripe in Emerald
	pdf.SetFillColor(16, 185, 129)
	pdf.Rect(107.5, remY, 2.0, remBoxH, "F")

	pdf.SetXY(111.5, remY+2)
	pdf.SetFont("Arial", "B", 7.5)
	pdf.SetTextColor(16, 185, 129)
	pdf.Cell(remBoxW-6, 4, "HEADMASTER / PRINCIPAL'S REMARK")

	if hRemark == "" {
		hRemark = "Satisfactory progress. Encouraged to maintain consistency in core subjects next term."
	}
	pdf.SetXY(111.5, remY+6.5)
	pdf.SetFont("Arial", "I", 7.5)
	pdf.SetTextColor(51, 65, 85)
	pdf.MultiCell(remBoxW-8, 3.6, hRemark, "", "L", false)

	// Headmaster Signature / Stamp
	headSigURL := ""
	if data.Tenant != nil && data.Tenant.HeadmasterSignatureURL != "" {
		headSigURL = data.Tenant.HeadmasterSignatureURL
	}
	s.drawImage(pdf, headSigURL, "head_sig_stamp", 111.5, remY+remBoxH-10, 28, 7, "", false)
	pdf.SetDrawColor(203, 213, 225)
	pdf.Line(111.5, remY+remBoxH-3.5, 192.5, remY+remBoxH-3.5)
	pdf.SetXY(111.5, remY+remBoxH-3.2)
	pdf.SetFont("Arial", "B", 6.5)
	pdf.SetTextColor(100, 116, 139)
	pdf.Cell(81, 3, "HEADMASTER / PRINCIPAL'S OFFICIAL STAMP & SIGNATURE")

	pdf.SetY(remY + remBoxH + 3)

	// ── 8. Next Term Resumption & Grading Scale Legend ────────────────────────
	footY := pdf.GetY()
	pdf.SetFillColor(241, 245, 249) // Slate 100
	pdf.SetDrawColor(226, 232, 240)
	pdf.RoundedRect(10, footY, 190, 13, 2, "1234", "FD")

	pdf.SetXY(14, footY+1.8)
	pdf.SetFont("Arial", "B", 7.5)
	pdf.SetTextColor(15, 23, 42)
	pdf.Cell(36, 4, "NEXT TERM RESUMES:")
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(79, 70, 229)
	resumptionDate := data.NextTermBegins
	if resumptionDate == "" {
		resumptionDate = "To Be Announced"
	}
	pdf.Cell(55, 4, resumptionDate)

	pdf.SetFont("Arial", "B", 7.5)
	pdf.SetTextColor(15, 23, 42)
	pdf.Cell(28, 4, "PROMOTION STATUS:")
	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(16, 185, 129)
	pdf.Cell(55, 4, promStatus)

	pdf.SetXY(14, footY+6.8)
	pdf.SetFont("Arial", "B", 6.5)
	pdf.SetTextColor(100, 116, 139)
	pdf.Cell(25, 4, "GRADING SCALE:")
	pdf.SetFont("Arial", "", 6.5)
	pdf.SetTextColor(71, 85, 105)
	pdf.Cell(150, 4, "80 - 100: A (Excellent)  |  70 - 79: B (Very Good)  |  60 - 69: C (Good)  |  50 - 59: D (Pass)  |  0 - 49: F (Fail)")
}

func getGradeScale(score float32) (string, string) {
	if score >= 80 {
		return "A", "Excellent"
	} else if score >= 70 {
		return "B", "Very Good"
	} else if score >= 60 {
		return "C", "Good"
	} else if score >= 50 {
		return "D", "Pass"
	}
	return "F", "Fail"
}
