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

// ClassRankingStudentRow holds a single student's data for the ranking table.
type ClassRankingStudentRow struct {
	Position      int
	AdmissionNum  string
	FullName      string
	SubjectScores []float64 // one entry per subject column (0 = no data)
	Total         float64   // sum of subject scores that have data
	GradeLetter   string
}

// ClassRankingReportData holds everything needed to render the Class Ranking PDF.
type ClassRankingReportData struct {
	Tenant       *domain.Tenant
	Class        *domain.Class
	TeacherName  string
	Term         string
	AcademicYear string
	Subjects     []string // column headers e.g. ["Mathematics","English","Science"]
	Rows         []ClassRankingStudentRow
	ClassAvg     []float64 // per-subject class averages
	OverallAvg   float64
}

// GenerateClassRankingReport renders a portrait A4 class league-table PDF.
func (s *PDFService) GenerateClassRankingReport(w io.Writer, data ClassRankingReportData) error {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(12, 12, 12)
	pdf.SetAutoPageBreak(true, 14)
	pdf.AddPage()

	pageW := 186.0 // 210 - 24 margins

	tenantName := "School Management System"
	if data.Tenant != nil && data.Tenant.Name != "" {
		tenantName = data.Tenant.Name
	}
	className := "Class"
	if data.Class != nil && data.Class.Name != "" {
		className = data.Class.Name
	}

	// ── Page Header ──────────────────────────────────────────────────
	pdf.SetFillColor(30, 41, 59)
	pdf.Rect(12, 12, pageW, 28, "F")

	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 13)
	pdf.SetXY(16, 15)
	pdf.CellFormat(pageW-8, 7, strings.ToUpper(tenantName), "", 1, "L", false, 0, "")

	pdf.SetFont("Arial", "B", 9)
	pdf.SetX(16)
	title := fmt.Sprintf("CLASS LEAGUE TABLE & PERFORMANCE RANKING - %s", strings.ToUpper(data.Term))
	pdf.CellFormat(pageW-60, 5, title, "", 0, "L", false, 0, "")

	// Academic year badge (right side)
	pdf.SetFillColor(37, 99, 235)
	badgeX := 12 + pageW - 52.0
	pdf.Rect(badgeX, 17, 50, 7, "F")
	pdf.SetFont("Arial", "B", 7.5)
	pdf.SetXY(badgeX, 17.5)
	pdf.CellFormat(50, 6, fmt.Sprintf("AY %s", data.AcademicYear), "", 1, "C", false, 0, "")

	// Metadata row
	pdf.SetTextColor(148, 163, 184)
	pdf.SetFont("Arial", "", 7)
	pdf.SetXY(16, 33)
	meta := fmt.Sprintf("Class Teacher: %s   |   Class: %s   |   Students: %d   |   Generated: %s",
		data.TeacherName, className, len(data.Rows), time.Now().Format("02 Jan 2006, 15:04"))
	pdf.CellFormat(pageW-8, 5, meta, "", 1, "L", false, 0, "")

	pdf.SetY(45)

	// ── Column widths ──────────────────────────────────────────────────
	numSubjects := len(data.Subjects)
	fixedW := 8.0
	nameW := 52.0
	admW := 24.0
	totalW := 20.0
	gradeW := 14.0
	posW := 14.0

	remaining := pageW - fixedW - nameW - admW - totalW - gradeW - posW
	subjColW := 20.0
	if numSubjects > 0 {
		calc := math.Floor(remaining / float64(numSubjects))
		if calc > 14 {
			subjColW = calc
		}
	}

	rowH := 6.5

	// ── Table Header ─────────────────────────────────────────────────
	pdf.SetFillColor(51, 65, 85)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 7)

	pdf.CellFormat(fixedW, rowH+1, "#", "1", 0, "C", true, 0, "")
	pdf.CellFormat(nameW, rowH+1, "SCHOLAR NAME", "1", 0, "L", true, 0, "")
	pdf.CellFormat(admW, rowH+1, "ADM. NO.", "1", 0, "C", true, 0, "")
	for _, subj := range data.Subjects {
		label := subj
		if len(label) > 11 {
			label = label[:11] + "."
		}
		pdf.CellFormat(subjColW, rowH+1, strings.ToUpper(label), "1", 0, "C", true, 0, "")
	}
	pdf.CellFormat(totalW, rowH+1, "TOTAL", "1", 0, "C", true, 0, "")
	pdf.CellFormat(gradeW, rowH+1, "GRADE", "1", 0, "C", true, 0, "")
	pdf.CellFormat(posW, rowH+1, "POS.", "1", 1, "C", true, 0, "")

	// ── Student rows ──────────────────────────────────────────────────
	for i, row := range data.Rows {
		switch row.Position {
		case 1:
			pdf.SetFillColor(251, 191, 36)
			pdf.SetTextColor(120, 60, 0)
		case 2:
			pdf.SetFillColor(203, 213, 225)
			pdf.SetTextColor(60, 80, 100)
		case 3:
			pdf.SetFillColor(180, 120, 60)
			pdf.SetTextColor(255, 255, 255)
		default:
			if i%2 == 1 {
				pdf.SetFillColor(248, 250, 252)
			} else {
				pdf.SetFillColor(255, 255, 255)
			}
			pdf.SetTextColor(30, 41, 59)
		}

		pdf.SetFont("Arial", "B", 7.5)
		pdf.CellFormat(fixedW, rowH, fmt.Sprintf("%d", row.Position), "1", 0, "C", true, 0, "")
		pdf.CellFormat(nameW, rowH, row.FullName, "1", 0, "L", true, 0, "")
		pdf.SetFont("Arial", "", 7)
		pdf.CellFormat(admW, rowH, row.AdmissionNum, "1", 0, "C", true, 0, "")

		// Subject score cells
		savedR, savedG, savedB := func() (int, int, int) {
			switch row.Position {
			case 1:
				return 120, 60, 0
			case 2:
				return 60, 80, 100
			case 3:
				return 255, 255, 255
			default:
				return 30, 41, 59
			}
		}()

		pdf.SetFont("Arial", "", 8)
		for _, score := range row.SubjectScores {
			if score <= 0 {
				pdf.SetTextColor(180, 180, 180)
				pdf.CellFormat(subjColW, rowH, "-", "1", 0, "C", true, 0, "")
				pdf.SetTextColor(savedR, savedG, savedB)
			} else {
				label := fmt.Sprintf("%.1f", score)
				if math.Mod(score, 1.0) == 0 {
					label = fmt.Sprintf("%.0f", score)
				}
				pdf.CellFormat(subjColW, rowH, label, "1", 0, "C", true, 0, "")
			}
		}

		// Total
		pdf.SetFont("Arial", "B", 8)
		totalLabel := "-"
		if row.Total > 0 {
			totalLabel = fmt.Sprintf("%.1f", row.Total)
		}
		pdf.CellFormat(totalW, rowH, totalLabel, "1", 0, "C", true, 0, "")

		// Grade letter with colour
		gc := rankingGradeColor(row.GradeLetter)
		pdf.SetTextColor(gc[0], gc[1], gc[2])
		pdf.SetFont("Arial", "B", 8)
		pdf.CellFormat(gradeW, rowH, row.GradeLetter, "1", 0, "C", true, 0, "")

		// Position ordinal
		pdf.SetTextColor(30, 41, 59)
		pdf.SetFont("Arial", "B", 7.5)
		pdf.CellFormat(posW, rowH, rankingOrdinal(row.Position), "1", 1, "C", true, 0, "")
	}

	// ── Class average footer row ──────────────────────────────────────
	pdf.SetFillColor(37, 99, 235)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 7.5)
	pdf.CellFormat(fixedW+nameW+admW, rowH, "CLASS AVERAGE", "1", 0, "R", true, 0, "")
	for ci := range data.Subjects {
		avg := 0.0
		if ci < len(data.ClassAvg) {
			avg = data.ClassAvg[ci]
		}
		label := "-"
		if avg > 0 {
			label = fmt.Sprintf("%.1f", avg)
		}
		pdf.CellFormat(subjColW, rowH, label, "1", 0, "C", true, 0, "")
	}
	overallLabel := "-"
	if data.OverallAvg > 0 {
		overallLabel = fmt.Sprintf("%.1f", data.OverallAvg)
	}
	pdf.CellFormat(totalW, rowH, overallLabel, "1", 0, "C", true, 0, "")
	pdf.CellFormat(gradeW+posW, rowH, "", "1", 1, "C", true, 0, "")

	// ── Footer on every page ─────────────────────────────────────────
	_, pgH := pdf.GetPageSize()
	for pg := 1; pg <= pdf.PageCount(); pg++ {
		pdf.SetPage(pg)
		pdf.SetFillColor(30, 41, 59)
		pdf.Rect(12, pgH-12, pageW, 8, "F")
		pdf.SetFont("Arial", "", 6.5)
		pdf.SetTextColor(148, 163, 184)
		pdf.SetXY(16, pgH-10)
		pdf.CellFormat(pageW/2, 5, fmt.Sprintf("CONFIDENTIAL - %s - %s Term Ranking", tenantName, data.Term), "", 0, "L", false, 0, "")
		pdf.SetXY(16+pageW/2, pgH-10)
		pdf.CellFormat(pageW/2, 5, fmt.Sprintf("Page %d of %d", pg, pdf.PageCount()), "", 0, "R", false, 0, "")
	}

	return pdf.Output(w)
}

// rankingGradeColor returns RGB for a grade letter.
func rankingGradeColor(letter string) [3]int {
	switch letter {
	case "A+", "A":
		return [3]int{16, 185, 129}
	case "B":
		return [3]int{59, 130, 246}
	case "C":
		return [3]int{161, 98, 7}
	case "D":
		return [3]int{249, 115, 22}
	case "F":
		return [3]int{239, 68, 68}
	default:
		return [3]int{100, 116, 139}
	}
}

// rankingOrdinal converts integer to ordinal string: 1 -> "1st", 2 -> "2nd" etc.
func rankingOrdinal(n int) string {
	suffix := "th"
	switch n % 10 {
	case 1:
		if n%100 != 11 {
			suffix = "st"
		}
	case 2:
		if n%100 != 12 {
			suffix = "nd"
		}
	case 3:
		if n%100 != 13 {
			suffix = "rd"
		}
	}
	return fmt.Sprintf("%d%s", n, suffix)
}

// ensure sort import is used (called from handler, but keep it here as a utility)
var _ = sort.Slice
