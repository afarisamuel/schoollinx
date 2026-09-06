package pdf

import (
	"fmt"
	"io"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/jung-kurt/gofpdf"
	"github.com/user/high-school-management/backend/internal/domain"
)

// GradebookColumn represents an individual assessment category and its configured weight percentage.
type GradebookColumn struct {
	Name   string  // e.g. "HOMEWORK & CLASSWORK", "MID-TERM EXAM", "END OF TERM EXAM", "PROJECT"
	Weight float32 // percentage, e.g. 25.0
}

// GradebookStudentRow represents a student's row in the Gradebook Matrix.
type GradebookStudentRow struct {
	StudentID      string
	EnrollmentNum  string
	FullName       string
	Scores         []float32 // raw scores for each column (0-100)
	Cumulative     float64   // weighted cumulative composite percentage (e.g. 67.5)
	Rank           int       // class rank (1, 2, 3...)
	GradeLetter    string    // e.g. "A", "B", "C", "D", "F"
	Remark         string    // e.g. "Distinction", "Proficient", "Satisfactory", "Developing"
	EvaluatedCount int       // number of columns with scores > 0
}

// GradebookReportData holds all information needed to generate the comprehensive, real-data Gradebook PDF.
type GradebookReportData struct {
	Tenant         *domain.Tenant
	Class          *domain.Class
	Teacher        *domain.Teacher
	TeacherName    string
	Subject        string // e.g. "Mathematics"
	Term           string // e.g. "Semester 1"
	AcademicYear   string // e.g. "2026/2027"
	Columns        []GradebookColumn
	Rows           []GradebookStudentRow
	TotalEnrolled  int
	TotalEvaluated int
	ClassAverage   float64
	HighestScore   float64
	LowestScore    float64
	PassRate       float64
	ColumnAverages []float64
}

// GenerateGradebookReport renders a landscape, high-density Gradebook Matrix PDF.
func (s *PDFService) GenerateGradebookReport(w io.Writer, data GradebookReportData) error {
	// A4 Landscape: 297mm width x 210mm height
	pdf := gofpdf.NewCustom(&gofpdf.InitType{
		OrientationStr: "L",
		UnitStr:        "mm",
		SizeStr:        "A4",
	})
	pdf.SetMargins(12, 10, 12)
	pdf.SetAutoPageBreak(false, 10)

	totalWidth := 273.0 // 297 - 24 margins

	// Ensure fallback columns if none provided
	if len(data.Columns) == 0 {
		data.Columns = []GradebookColumn{
			{Name: "HOMEWORK & CLASSWORK", Weight: 25},
			{Name: "MID-TERM EXAM", Weight: 25},
			{Name: "END OF TERM EXAM", Weight: 25},
			{Name: "PROJECT / CONTINUOUS", Weight: 25},
		}
	}

	// Calculate column widths
	colIdxW := 8.0
	colIdW := 25.0
	colNameW := 56.0
	colTotalW := 22.0
	colRankW := 15.0
	colGradeW := 15.0
	colRemarkW := 24.0

	fixedWidth := colIdxW + colIdW + colNameW + colTotalW + colRankW + colGradeW + colRemarkW
	remainingWidth := totalWidth - fixedWidth
	numAssessmentCols := len(data.Columns)
	assessmentColW := remainingWidth / float64(numAssessmentCols)

	// Helper for header rendering on each page
	drawHeader := func(isFirstPage bool) {
		// Watermark
		if data.Tenant != nil && data.Tenant.LogoURL != "" {
			s.drawWatermark(pdf, data.Tenant.LogoURL)
		}

		// Top Decorative Dual-tone Bars
		pdf.SetFillColor(30, 41, 59) // Slate 800
		pdf.Rect(0, 0, 297, 3.5, "F")
		pdf.SetFillColor(79, 70, 229) // Indigo 600
		pdf.Rect(0, 3.5, 297, 1.0, "F")

		if isFirstPage {
			// Left: School Crest / Logo
			logoURL := ""
			if data.Tenant != nil && data.Tenant.LogoURL != "" {
				logoURL = data.Tenant.LogoURL
			}
			s.drawImage(pdf, logoURL, "gradebook_school_logo", 12, 7.0, 22, 22, "CREST", true)

			// Center: School Branding
			tenantName := "ACADEMIC INSTITUTION"
			if data.Tenant != nil && data.Tenant.Name != "" {
				tenantName = strings.ToUpper(data.Tenant.Name)
			}
			pdf.SetY(6.5)
			pdf.SetX(38)
			pdf.SetTextColor(15, 23, 42) // Slate 900
			pdf.SetFont("Arial", "B", 14)
			pdf.CellFormat(220, 6, tenantName, "", 1, "L", false, 0, "")

			if data.Tenant != nil && data.Tenant.Motto != "" {
				pdf.SetX(38)
				pdf.SetTextColor(79, 70, 229) // Indigo 600
				pdf.SetFont("Arial", "I", 8)
				pdf.CellFormat(220, 4, fmt.Sprintf(`"%s"`, data.Tenant.Motto), "", 1, "L", false, 0, "")
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
				contactLine = "Official Institutional Gradebook & Continuous Assessment Records"
			}
			pdf.SetX(38)
			pdf.SetTextColor(100, 116, 139) // Slate 500
			pdf.SetFont("Arial", "", 7.5)
			pdf.CellFormat(220, 4, contactLine, "", 1, "L", false, 0, "")

			// Right: Official Record Security Badge
			pdf.SetY(7.0)
			pdf.SetX(240)
			pdf.SetFillColor(241, 245, 249) // Slate 100
			pdf.SetDrawColor(203, 213, 225) // Slate 300
			pdf.RoundedRect(240, 7.0, 45, 17, 2, "1234", "FD")
			pdf.SetY(8.5)
			pdf.SetX(240)
			pdf.SetTextColor(79, 70, 229) // Indigo 600
			pdf.SetFont("Arial", "B", 7)
			pdf.CellFormat(45, 3.5, "OFFICIAL GRADEBOOK", "", 2, "C", false, 0, "")
			pdf.SetTextColor(100, 116, 139)
			pdf.SetFont("Arial", "", 6.5)
			pdf.CellFormat(45, 3.2, fmt.Sprintf("Issued: %s", time.Now().Format("02 Jan 2006")), "", 2, "C", false, 0, "")
			pdf.SetTextColor(15, 23, 42)
			pdf.SetFont("Arial", "B", 6.5)
			pdf.CellFormat(45, 3.2, "VERIFIED ACADEMIC RECORD", "", 2, "C", false, 0, "")

			// ── Title Banner ──────────────────────────────────────────────────
			pdf.SetY(27.5)
			pdf.SetX(12)
			pdf.SetFillColor(30, 41, 59) // Slate 800
			pdf.Rect(12, 27.5, totalWidth, 7.5, "F")

			pdf.SetTextColor(255, 255, 255)
			pdf.SetFont("Arial", "B", 9.5)
			pdf.SetX(16)
			pdf.CellFormat(180, 7.5, "SPEED GRADEBOOK & CONTINUOUS ASSESSMENT AUDIT MATRIX", "", 0, "L", false, 0, "")

			termPill := fmt.Sprintf("%s | ACADEMIC YEAR %s", strings.ToUpper(data.Term), strings.ToUpper(data.AcademicYear))
			if data.AcademicYear == "" {
				termPill = strings.ToUpper(data.Term)
			}
			pdf.SetFont("Arial", "B", 8)
			pdf.SetTextColor(251, 191, 36) // Amber 400
			pdf.CellFormat(89, 7.5, termPill, "", 1, "R", false, 0, "")

			// ── Context Meta Bar (4 Columns) ──────────────────────────────────
			pdf.SetY(37.0)
			pdf.SetX(12)
			pdf.SetFillColor(248, 250, 252) // Slate 50
			pdf.SetDrawColor(226, 232, 240) // Slate 200
			pdf.Rect(12, 37.0, totalWidth, 8.5, "FD")

			metaColW := totalWidth / 4.0
			drawMetaPill := func(x float64, label, value string, isBold bool) {
				pdf.SetY(37.5)
				pdf.SetX(x + 2)
				pdf.SetTextColor(100, 116, 139) // Slate 500
				pdf.SetFont("Arial", "B", 6.5)
				pdf.CellFormat(metaColW-4, 3.2, strings.ToUpper(label), "", 2, "L", false, 0, "")

				pdf.SetTextColor(15, 23, 42) // Slate 900
				if isBold {
					pdf.SetFont("Arial", "B", 8)
				} else {
					pdf.SetFont("Arial", "", 8)
				}
				pdf.CellFormat(metaColW-4, 4.0, value, "", 2, "L", false, 0, "")
			}

			className := "N/A"
			if data.Class != nil && data.Class.Name != "" {
				className = data.Class.Name
			}
			drawMetaPill(12, "Class Stream", className, true)

			subjectName := "All Core Subjects"
			if data.Subject != "" {
				subjectName = data.Subject
			}
			drawMetaPill(12+metaColW, "Subject / Learning Area", subjectName, true)

			teacherName := "Unassigned"
			if data.TeacherName != "" {
				teacherName = data.TeacherName
			} else if data.Teacher != nil {
				teacherName = fmt.Sprintf("%s %s", string(data.Teacher.FirstName), string(data.Teacher.LastName))
			}
			drawMetaPill(12+metaColW*2, "Form / Subject Master", teacherName, false)

			drawMetaPill(12+metaColW*3, "Assessment Standard", fmt.Sprintf("Weighted Matrix (%d Evaluation Columns)", len(data.Columns)), false)

			// ── Telemetry KPI Summary Strip (4 Cards) ────────────────────────
			pdf.SetY(47.5)
			kpiCardW := (totalWidth - 9) / 4.0
			kpiH := 10.5

			drawKPICard := func(idx int, label, val, subtext string, valR, valG, valB int) {
				kpiX := 12.0 + float64(idx)*(kpiCardW+3.0)
				pdf.SetFillColor(248, 250, 252)
				pdf.SetDrawColor(226, 232, 240)
				pdf.RoundedRect(kpiX, 47.5, kpiCardW, kpiH, 1.5, "1234", "FD")

				pdf.SetY(48.2)
				pdf.SetX(kpiX + 2.5)
				pdf.SetTextColor(100, 116, 139)
				pdf.SetFont("Arial", "B", 6.0)
				pdf.CellFormat(kpiCardW-5, 2.8, strings.ToUpper(label), "", 2, "L", false, 0, "")

				pdf.SetTextColor(valR, valG, valB)
				pdf.SetFont("Arial", "B", 8.5)
				pdf.CellFormat(kpiCardW-5, 3.8, val, "", 2, "L", false, 0, "")

				pdf.SetTextColor(148, 163, 184)
				pdf.SetFont("Arial", "", 5.5)
				pdf.CellFormat(kpiCardW-5, 2.2, subtext, "", 2, "L", false, 0, "")
			}

			evalPct := 0.0
			if data.TotalEnrolled > 0 {
				evalPct = (float64(data.TotalEvaluated) / float64(data.TotalEnrolled)) * 100.0
			}

			drawKPICard(0, "Enrolled Cohort", fmt.Sprintf("%d Scholars", data.TotalEnrolled), "Class Roster Total", 30, 41, 59)
			drawKPICard(1, "Grading Progress", fmt.Sprintf("%.1f%%", evalPct), fmt.Sprintf("%d of %d Evaluated", data.TotalEvaluated, data.TotalEnrolled), 16, 185, 129)
			drawKPICard(2, "Class Mean Score", fmt.Sprintf("%.1f%%", data.ClassAverage), "Weighted Composite Average", 79, 70, 229)
			drawKPICard(3, "Mastery Pass Rate", fmt.Sprintf("%.1f%%", data.PassRate), "Scholars Scoring >= 50%", 217, 119, 6)

			pdf.SetY(60.0)
		} else {
			// Compact Header for Page 2+
			pdf.SetY(6.5)
			pdf.SetX(12)
			pdf.SetFillColor(30, 41, 59)
			pdf.Rect(12, 6.5, totalWidth, 6.0, "F")

			className := "Class"
			if data.Class != nil && data.Class.Name != "" {
				className = data.Class.Name
			}
			subj := "Gradebook"
			if data.Subject != "" {
				subj = data.Subject
			}
			pdf.SetTextColor(255, 255, 255)
			pdf.SetFont("Arial", "B", 8)
			pdf.SetX(16)
			pdf.CellFormat(180, 6.0, fmt.Sprintf("%s - %s (Official Gradebook Matrix - Continued)", className, subj), "", 0, "L", false, 0, "")

			pdf.SetTextColor(251, 191, 36)
			pdf.CellFormat(89, 6.0, fmt.Sprintf("%s | Page %d", strings.ToUpper(data.Term), pdf.PageNo()), "", 1, "R", false, 0, "")

			pdf.SetY(14.5)
		}
	}

	// Helper to draw the table header
	drawTableHeader := func() {
		headerY := pdf.GetY()
		pdf.SetX(12)

		// Top Header Row (Dark Slate 800)
		pdf.SetFillColor(30, 41, 59)
		pdf.SetDrawColor(15, 23, 42)
		pdf.SetTextColor(255, 255, 255)
		pdf.SetFont("Arial", "B", 7.5)

		pdf.CellFormat(colIdxW, 8.5, "#", "1", 0, "C", true, 0, "")
		pdf.CellFormat(colIdW, 8.5, "STUDENT ID", "1", 0, "C", true, 0, "")
		pdf.CellFormat(colNameW, 8.5, "SCHOLAR NAME", "1", 0, "L", true, 0, "")

		// Assessment Columns
		for _, col := range data.Columns {
			catTitle := strings.ToUpper(col.Name)
			if len(catTitle) > 18 {
				catTitle = catTitle[:16] + ".."
			}
			// Multi-line cell representation: Name on top, weight below
			colX := pdf.GetX()
			pdf.CellFormat(assessmentColW, 8.5, "", "1", 0, "C", true, 0, "")
			
			// Draw text inside cell
			pdf.SetY(headerY + 1.2)
			pdf.SetX(colX)
			pdf.SetTextColor(255, 255, 255)
			pdf.SetFont("Arial", "B", 6.5)
			pdf.CellFormat(assessmentColW, 3.2, catTitle, "", 2, "C", false, 0, "")

			pdf.SetTextColor(147, 197, 253) // Blue 300
			pdf.SetFont("Arial", "B", 6.0)
			pdf.CellFormat(assessmentColW, 2.8, fmt.Sprintf("(Weight: %.0f%%)", col.Weight), "", 2, "C", false, 0, "")

			pdf.SetY(headerY)
			pdf.SetX(colX + assessmentColW)
		}

		// Cumulative Total
		pdf.SetFillColor(67, 56, 202) // Indigo 700
		pdf.SetTextColor(255, 255, 255)
		pdf.SetFont("Arial", "B", 7.5)
		colTotalX := pdf.GetX()
		pdf.CellFormat(colTotalW, 8.5, "", "1", 0, "C", true, 0, "")
		pdf.SetY(headerY + 1.2)
		pdf.SetX(colTotalX)
		pdf.CellFormat(colTotalW, 3.2, "TOTAL", "", 2, "C", false, 0, "")
		pdf.SetTextColor(251, 191, 36) // Amber 400
		pdf.SetFont("Arial", "B", 6.0)
		pdf.CellFormat(colTotalW, 2.8, "(100%)", "", 2, "C", false, 0, "")
		pdf.SetY(headerY)
		pdf.SetX(colTotalX + colTotalW)

		// Rank, Grade, Remark
		pdf.SetFillColor(30, 41, 59)
		pdf.SetTextColor(255, 255, 255)
		pdf.SetFont("Arial", "B", 7.5)
		pdf.CellFormat(colRankW, 8.5, "RANK", "1", 0, "C", true, 0, "")
		pdf.CellFormat(colGradeW, 8.5, "GRADE", "1", 0, "C", true, 0, "")
		pdf.CellFormat(colRemarkW, 8.5, "REMARK", "1", 1, "C", true, 0, "")
	}

	// ── Page 1 Setup ────────────────────────────────────────────────────────
	pdf.AddPage()
	drawHeader(true)
	drawTableHeader()

	// ── Render Student Rows ─────────────────────────────────────────────────
	rowHeight := 6.5
	for i, row := range data.Rows {
		// Check for page break
		if pdf.GetY()+rowHeight > 192.0 {
			pdf.AddPage()
			drawHeader(false)
			drawTableHeader()
		}

		currY := pdf.GetY()
		pdf.SetX(12)

		// Alternating Row Background
		if i%2 == 0 {
			pdf.SetFillColor(255, 255, 255)
		} else {
			pdf.SetFillColor(248, 250, 252) // Slate 50
		}
		pdf.SetDrawColor(226, 232, 240) // Slate 200

		// #
		pdf.SetTextColor(100, 116, 139)
		pdf.SetFont("Arial", "", 7.5)
		pdf.CellFormat(colIdxW, rowHeight, fmt.Sprintf("%d", i+1), "1", 0, "C", true, 0, "")

		// Student ID
		pdf.SetTextColor(71, 85, 105)
		pdf.SetFont("Arial", "B", 7.5)
		enrollment := row.EnrollmentNum
		if enrollment == "" {
			enrollment = "N/A"
		}
		pdf.CellFormat(colIdW, rowHeight, enrollment, "1", 0, "C", true, 0, "")

		// Scholar Name
		pdf.SetTextColor(15, 23, 42)
		pdf.SetFont("Arial", "B", 8)
		nameStr := row.FullName
		if len(nameStr) > 28 {
			nameStr = nameStr[:26] + ".."
		}
		pdf.CellFormat(colNameW, rowHeight, "  "+nameStr, "1", 0, "L", true, 0, "")

		// Assessment Scores
		pdf.SetFont("Arial", "", 8)
		for colIdx := range data.Columns {
			scoreVal := float32(0.0)
			if colIdx < len(row.Scores) {
				scoreVal = row.Scores[colIdx]
			}

			scoreStr := "-"
			if scoreVal > 0 {
				scoreStr = fmt.Sprintf("%.1f", scoreVal)
				if math.Mod(float64(scoreVal), 1.0) == 0 {
					scoreStr = fmt.Sprintf("%.0f", scoreVal)
				}
				pdf.SetTextColor(15, 23, 42)
			} else {
				pdf.SetTextColor(148, 163, 184) // Muted dash
			}
			pdf.CellFormat(assessmentColW, rowHeight, scoreStr, "1", 0, "C", true, 0, "")
		}

		// Cumulative Total (Highlighted)
		pdf.SetFillColor(238, 242, 255) // Indigo 50
		pdf.SetTextColor(67, 56, 202)   // Indigo 700
		pdf.SetFont("Arial", "B", 8.5)
		cumStr := "-"
		if row.Cumulative > 0 {
			cumStr = fmt.Sprintf("%.1f%%", row.Cumulative)
		}
		pdf.CellFormat(colTotalW, rowHeight, cumStr, "1", 0, "C", true, 0, "")

		// Rank
		rankStr := "-"
		if row.Rank > 0 {
			rankStr = fmt.Sprintf("#%d", row.Rank)
			if row.Rank == 1 {
				pdf.SetTextColor(217, 119, 6) // Amber 600
				pdf.SetFont("Arial", "B", 8.5)
			} else if row.Rank <= 3 {
				pdf.SetTextColor(79, 70, 229) // Indigo 600
				pdf.SetFont("Arial", "B", 8)
			} else {
				pdf.SetTextColor(71, 85, 105)
				pdf.SetFont("Arial", "", 7.5)
			}
		} else {
			pdf.SetTextColor(148, 163, 184)
			pdf.SetFont("Arial", "", 7.5)
		}
		pdf.SetFillColor(255, 255, 255)
		if i%2 == 1 {
			pdf.SetFillColor(248, 250, 252)
		}
		pdf.CellFormat(colRankW, rowHeight, rankStr, "1", 0, "C", true, 0, "")

		// Grade Badge
		gradeLetter := row.GradeLetter
		if gradeLetter == "" {
			gradeLetter = "-"
		}
		switch gradeLetter {
		case "A+", "A":
			pdf.SetTextColor(16, 185, 129) // Emerald
		case "B":
			pdf.SetTextColor(59, 130, 246) // Blue
		case "C":
			pdf.SetTextColor(245, 158, 11) // Amber
		case "D":
			pdf.SetTextColor(234, 88, 12)  // Orange
		case "E", "F":
			pdf.SetTextColor(239, 68, 68)  // Red
		default:
			pdf.SetTextColor(100, 116, 139)
		}
		pdf.SetFont("Arial", "B", 8)
		pdf.CellFormat(colGradeW, rowHeight, gradeLetter, "1", 0, "C", true, 0, "")

		// Remark
		remark := row.Remark
		if remark == "" {
			remark = "Pending"
		}
		pdf.SetTextColor(71, 85, 105)
		pdf.SetFont("Arial", "", 7.0)
		pdf.CellFormat(colRemarkW, rowHeight, remark, "1", 1, "C", true, 0, "")

		_ = currY
	}

	// ── Class Averages Summary Row ──────────────────────────────────────────
	if len(data.Rows) > 0 {
		if pdf.GetY()+rowHeight > 192.0 {
			pdf.AddPage()
			drawHeader(false)
			drawTableHeader()
		}

		pdf.SetX(12)
		pdf.SetFillColor(241, 245, 249) // Slate 100
		pdf.SetDrawColor(203, 213, 225) // Slate 300
		pdf.SetTextColor(15, 23, 42)    // Slate 900
		pdf.SetFont("Arial", "B", 7.5)

		summaryLabelW := colIdxW + colIdW + colNameW
		pdf.CellFormat(summaryLabelW, rowHeight+0.5, "CLASS MEAN / COMPOSITE AVERAGE", "1", 0, "R", true, 0, "")

		// Assessment Column Averages
		for colIdx := range data.Columns {
			avgVal := float64(0.0)
			if colIdx < len(data.ColumnAverages) {
				avgVal = data.ColumnAverages[colIdx]
			}
			avgStr := "-"
			if avgVal > 0 {
				avgStr = fmt.Sprintf("%.1f", avgVal)
			}
			pdf.CellFormat(assessmentColW, rowHeight+0.5, avgStr, "1", 0, "C", true, 0, "")
		}

		// Cumulative Average
		pdf.SetFillColor(224, 231, 255) // Indigo 100
		pdf.SetTextColor(67, 56, 202)   // Indigo 700
		pdf.SetFont("Arial", "B", 8.5)
		cumAvgStr := fmt.Sprintf("%.1f%%", data.ClassAverage)
		pdf.CellFormat(colTotalW, rowHeight+0.5, cumAvgStr, "1", 0, "C", true, 0, "")

		// Empty for Rank, Grade, Remark summary
		pdf.SetFillColor(241, 245, 249)
		pdf.SetTextColor(100, 116, 139)
		pdf.SetFont("Arial", "I", 6.5)
		pdf.CellFormat(colRankW, rowHeight+0.5, "Class", "1", 0, "C", true, 0, "")
		pdf.CellFormat(colGradeW, rowHeight+0.5, "Summary", "1", 0, "C", true, 0, "")
		pdf.CellFormat(colRemarkW, rowHeight+0.5, fmt.Sprintf("%.0f%% Pass", data.PassRate), "1", 1, "C", true, 0, "")
	}

	// ── Signatures & Stamp Blocks (Bottom) ──────────────────────────────────
	// Ensure signatures fit on page, or append a footer
	if pdf.GetY() > 175.0 {
		pdf.AddPage()
		drawHeader(false)
	}

	sigY := math.Max(pdf.GetY()+6.0, 180.0)
	pdf.SetY(sigY)

	// Left: Form / Subject Master
	pdf.SetX(20)
	pdf.SetDrawColor(148, 163, 184)
	pdf.Line(20, sigY+9, 90, sigY+9)
	pdf.SetY(sigY + 10)
	pdf.SetX(20)
	pdf.SetTextColor(71, 85, 105)
	pdf.SetFont("Arial", "B", 7)
	pdf.CellFormat(70, 3.5, "SUBJECT MASTER / EVALUATOR", "", 2, "C", false, 0, "")
	pdf.SetTextColor(148, 163, 184)
	pdf.SetFont("Arial", "", 6.5)
	pdf.CellFormat(70, 3.0, "Signature & Date", "", 2, "C", false, 0, "")

	// Center: Official Institutional Seal Box
	pdf.SetFillColor(248, 250, 252)
	pdf.SetDrawColor(226, 232, 240)
	pdf.RoundedRect(123, sigY-2, 50, 16, 2, "1234", "FD")
	pdf.SetY(sigY + 3.5)
	pdf.SetX(123)
	pdf.SetTextColor(148, 163, 184)
	pdf.SetFont("Arial", "B", 6.5)
	pdf.CellFormat(50, 3.5, "[ INSTITUTIONAL SEAL ]", "", 2, "C", false, 0, "")

	// Right: Head of Academics / Principal
	pdf.SetY(sigY)
	pdf.SetX(207)
	pdf.Line(207, sigY+9, 277, sigY+9)
	pdf.SetY(sigY + 10)
	pdf.SetX(207)
	pdf.SetTextColor(71, 85, 105)
	pdf.SetFont("Arial", "B", 7)
	pdf.CellFormat(70, 3.5, "HEAD OF ACADEMICS / PRINCIPAL", "", 2, "C", false, 0, "")
	pdf.SetTextColor(148, 163, 184)
	pdf.SetFont("Arial", "", 6.5)
	pdf.CellFormat(70, 3.0, "Signature & Stamp", "", 2, "C", false, 0, "")

	// Dynamic Global Footer
	pdf.SetY(-8)
	pdf.SetFont("Arial", "I", 7)
	pdf.SetTextColor(148, 163, 184)
	className := "Class"
	if data.Class != nil && data.Class.Name != "" {
		className = data.Class.Name
	}
	pdf.CellFormat(273, 5, fmt.Sprintf("SOFTWARE BY THINKCE | Generated on %s | Class: %s | Term: %s | Page %d",
		time.Now().Format("2006-01-02 15:04"), className, data.Term, pdf.PageNo()), "", 0, "C", false, 0, "")

	return pdf.Output(w)
}

// ComputeGradeLetterAndRemark maps a weighted total score (0-100) to standard letter grade & descriptive remark.
func ComputeGradeLetterAndRemark(score float64) (string, string) {
	switch {
	case score >= 80:
		return "A", "Distinction"
	case score >= 70:
		return "B", "Proficient / Very Good"
	case score >= 60:
		return "C", "Satisfactory / Good"
	case score >= 50:
		return "D", "Pass / Developing"
	case score > 0:
		return "F", "Needs Intervention"
	default:
		return "-", "Pending Assessment"
	}
}

// SortGradebookRows sorts student rows by rank, then alphabetically by name.
func SortGradebookRows(rows []GradebookStudentRow) {
	sort.SliceStable(rows, func(i, j int) bool {
		if rows[i].Rank > 0 && rows[j].Rank > 0 && rows[i].Rank != rows[j].Rank {
			return rows[i].Rank < rows[j].Rank
		}
		if rows[i].Rank > 0 && rows[j].Rank == 0 {
			return true
		}
		if rows[i].Rank == 0 && rows[j].Rank > 0 {
			return false
		}
		return strings.ToLower(rows[i].FullName) < strings.ToLower(rows[j].FullName)
	})
}
