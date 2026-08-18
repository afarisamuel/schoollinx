package pdf

import (
	"fmt"
	"strconv"

	"github.com/jung-kurt/gofpdf"
	"github.com/user/high-school-management/backend/internal/domain"
)

// TerminalReportData holds all necessary info to generate the terminal report
type TerminalReportData struct {
	Student          *domain.Student
	Tenant           *domain.Tenant
	Grades           []domain.Grade
	Evaluation       *domain.TerminalEvaluation
	Attendance       map[string]int
	Term             string
	AcademicYear     string
	NextTermBegins   string
	PromotedTo       string
	ClassSize        int
	PositionInClass  string
}

func (s *PDFService) drawTerminalReport(pdf *gofpdf.Fpdf, data TerminalReportData) {
	// Add watermark first so it stays in the background
	if data.Tenant != nil && data.Tenant.LogoURL != "" {
		s.drawWatermark(pdf, data.Tenant.LogoURL)
	}

	// 1. Header (Logo, School Details, Photo)
	pdf.SetFont("Arial", "B", 18)
	pdf.CellFormat(190, 10, data.Tenant.Name, "", 0, "C", false, 0, "")
	pdf.Ln(8)
	
	pdf.SetFont("Arial", "", 10)
	if data.Tenant.Address != "" {
		pdf.CellFormat(190, 6, data.Tenant.Address, "", 0, "C", false, 0, "")
		pdf.Ln(5)
	}
	if data.Tenant.ContactNumbers != "" {
		pdf.CellFormat(190, 6, data.Tenant.ContactNumbers, "", 0, "C", false, 0, "")
		pdf.Ln(5)
	}
	
	pdf.SetFont("Arial", "BU", 14)
	pdf.CellFormat(190, 10, "TERMINAL PROGRESS REPORT", "", 0, "C", false, 0, "")
	pdf.Ln(15)

	// 2. Student Details Bar
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(25, 8, "STUDENT ID:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(40, 8, data.Student.EnrollmentNum, "", 0, "L", false, 0, "")

	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(15, 8, "NAME:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(60, 8, fmt.Sprintf("%s %s", string(data.Student.FirstName), string(data.Student.LastName)), "", 0, "L", false, 0, "")

	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(15, 8, "CLASS:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(30, 8, fmt.Sprintf("Level %d", data.Student.Level), "", 0, "L", false, 0, "")
	pdf.Ln(8)

	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(30, 8, "NO ON ROLL:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(35, 8, strconv.Itoa(data.ClassSize), "", 0, "L", false, 0, "")

	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(15, 8, "TERM:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(60, 8, data.Term, "", 0, "L", false, 0, "")
	pdf.Ln(12)

	// 3. Grades Table
	pdf.SetFillColor(230, 230, 230)
	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(60, 8, "SUBJECT", "1", 0, "C", true, 0, "")
	
	cw := data.Tenant.ClassScoreWeight
	ew := data.Tenant.ExamScoreWeight
	if cw == 0 && ew == 0 {
		cw, ew = 0.5, 0.5
	}

	classScoreHeader := fmt.Sprintf("CLASS SCORE (%.0f%%)", cw*100)
	examScoreHeader := fmt.Sprintf("EXAMS SCORE (%.0f%%)", ew*100)

	pdf.CellFormat(30, 8, classScoreHeader, "1", 0, "C", true, 0, "")
	pdf.CellFormat(30, 8, examScoreHeader, "1", 0, "C", true, 0, "")
	pdf.CellFormat(25, 8, "TOTAL (100%)", "1", 0, "C", true, 0, "")
	pdf.CellFormat(15, 8, "GRADE", "1", 0, "C", true, 0, "")
	pdf.CellFormat(30, 8, "REMARK", "1", 0, "C", true, 0, "")
	pdf.Ln(8)

	pdf.SetFont("Arial", "", 9)
	
	type subjectGrade struct {
		Class float32
		Exam  float32
		Total float32
	}
	subjectMap := make(map[string]*subjectGrade)
	for _, g := range data.Grades {
		if _, ok := subjectMap[g.Subject]; !ok {
			subjectMap[g.Subject] = &subjectGrade{}
		}
		if g.Category == domain.CategoryFinal {
			subjectMap[g.Subject].Exam += g.Value
		} else {
			subjectMap[g.Subject].Class += g.Value
		}
	}

	var overallTotal float32 = 0
	var subjectCount float32 = 0

	for subject, sg := range subjectMap {
		pdf.CellFormat(60, 8, subject, "1", 0, "L", false, 0, "")
		pdf.CellFormat(30, 8, fmt.Sprintf("%.2f", sg.Class), "1", 0, "C", false, 0, "")
		pdf.CellFormat(30, 8, fmt.Sprintf("%.2f", sg.Exam), "1", 0, "C", false, 0, "")
		
		sg.Total = (sg.Class * cw) + (sg.Exam * ew)
		overallTotal += sg.Total
		subjectCount++

		pdf.CellFormat(25, 8, fmt.Sprintf("%.2f", sg.Total), "1", 0, "C", false, 0, "")
		
		gradeLetter, remark := getGradeScale(sg.Total)
		pdf.CellFormat(15, 8, gradeLetter, "1", 0, "C", false, 0, "")
		pdf.CellFormat(30, 8, remark, "1", 0, "L", false, 0, "")
		pdf.Ln(8)
	}

	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(60, 8, "OVERALL TOTAL", "1", 0, "C", true, 0, "")
	pdf.CellFormat(60, 8, "", "1", 0, "C", true, 0, "")
	pdf.CellFormat(25, 8, fmt.Sprintf("%.2f", overallTotal), "1", 0, "C", true, 0, "")
	overallAvg := float32(0)
	if subjectCount > 0 {
		overallAvg = overallTotal / subjectCount
	}
	ovLetter, _ := getGradeScale(overallAvg)
	pdf.CellFormat(15, 8, ovLetter, "1", 0, "C", true, 0, "")
	pdf.CellFormat(30, 8, "", "1", 0, "C", true, 0, "")
	pdf.Ln(12)

	// 4. Attendance & Evaluation
	totalDays := data.Attendance["present"] + data.Attendance["absent"]
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(35, 8, "ATTENDANCE:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(60, 8, fmt.Sprintf("%d OUT OF %d", data.Attendance["present"], totalDays), "", 0, "L", false, 0, "")

	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(35, 8, "PROMOTED TO:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(60, 8, data.PromotedTo, "", 0, "L", false, 0, "")
	pdf.Ln(8)

	conduct, attitude, interest, cRemark, hRemark := "", "", "", "", ""
	if data.Evaluation != nil {
		conduct = data.Evaluation.Conduct
		attitude = data.Evaluation.Attitude
		interest = data.Evaluation.Interest
		cRemark = data.Evaluation.ClassTeacherRemark
		hRemark = data.Evaluation.HeadTeacherRemark
	}

	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(35, 8, "CONDUCT:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(60, 8, conduct, "", 0, "L", false, 0, "")
	pdf.Ln(8)

	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(35, 8, "ATTITUDE:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(60, 8, attitude, "", 0, "L", false, 0, "")
	pdf.Ln(8)

	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(35, 8, "INTEREST:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(60, 8, interest, "", 0, "L", false, 0, "")
	pdf.Ln(12)

	// Remarks
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(60, 8, "CLASS TEACHER'S REMARK:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "I", 10)
	pdf.CellFormat(130, 8, cRemark, "", 0, "L", false, 0, "")
	pdf.Ln(10)

	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(60, 8, "HEAD TEACHER'S REMARK:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "I", 10)
	pdf.CellFormat(130, 8, hRemark, "", 0, "L", false, 0, "")
	pdf.Ln(15)

	// Signatures
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(95, 8, "_________________________", "", 0, "C", false, 0, "")
	pdf.CellFormat(95, 8, "_________________________", "", 0, "C", false, 0, "")
	pdf.Ln(6)
	pdf.CellFormat(95, 8, "CLASS TEACHER", "", 0, "C", false, 0, "")
	pdf.CellFormat(95, 8, "HEAD TEACHER", "", 0, "C", false, 0, "")
	pdf.Ln(15)

	// Next term
	if data.NextTermBegins != "" {
		pdf.CellFormat(190, 8, fmt.Sprintf("NEXT TERM BEGINS: %s", data.NextTermBegins), "", 0, "L", false, 0, "")
		pdf.Ln(10)
	}

	// Explanations / Legend
	pdf.SetFont("Arial", "B", 8)
	pdf.CellFormat(190, 6, "EXPLANATIONS:", "", 0, "L", false, 0, "")
	pdf.Ln(6)
	pdf.SetFont("Arial", "", 8)
	pdf.CellFormat(190, 5, "CONDUCT: Behavior towards school rules.", "", 0, "L", false, 0, "")
	pdf.Ln(5)
	pdf.CellFormat(190, 5, "ATTITUDE: Behavior towards learning and others.", "", 0, "L", false, 0, "")
	pdf.Ln(8)

	pdf.SetFont("Arial", "B", 8)
	pdf.CellFormat(190, 6, "LEGEND:", "", 0, "L", false, 0, "")
	pdf.Ln(6)
	pdf.SetFont("Arial", "", 8)
	pdf.CellFormat(190, 5, "80-100: A (Excellent) | 70-79: B (Very Good) | 60-69: C (Good) | 50-59: D (Pass) | 0-49: F (Fail)", "", 0, "L", false, 0, "")
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
