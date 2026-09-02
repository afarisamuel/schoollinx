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
}

func (s *PDFService) drawTerminalReport(pdf *gofpdf.Fpdf, data TerminalReportData) {
	// Add watermark first so it stays in the background
	if data.Tenant != nil && data.Tenant.LogoURL != "" {
		s.drawWatermark(pdf, data.Tenant.LogoURL)
	}

	// 1. Header (Logo, School Details, Photo)
	pdf.SetTextColor(30, 41, 59) // Slate 800
	pdf.SetFont("Arial", "B", 22)
	pdf.CellFormat(190, 10, data.Tenant.Name, "", 0, "C", false, 0, "")
	pdf.Ln(10)
	
	pdf.SetTextColor(71, 85, 105) // Slate 600
	pdf.SetFont("Arial", "", 10)
	if data.Tenant.Address != "" {
		pdf.CellFormat(190, 5, data.Tenant.Address, "", 0, "C", false, 0, "")
		pdf.Ln(5)
	}
	if data.Tenant.ContactNumbers != "" {
		pdf.CellFormat(190, 5, data.Tenant.ContactNumbers, "", 0, "C", false, 0, "")
		pdf.Ln(5)
	}
	
	pdf.Ln(4)
	// Title
	pdf.SetFillColor(241, 245, 249) // Slate 100
	pdf.SetTextColor(15, 23, 42) // Slate 900
	pdf.SetFont("Arial", "B", 14)
	pdf.CellFormat(190, 12, "TERMINAL PROGRESS REPORT", "1", 0, "C", true, 0, "")
	pdf.Ln(18)

	// 2. Student Details Bar
	pdf.SetTextColor(51, 65, 85) // Slate 700
	pdf.SetFont("Arial", "B", 9)
	
	// Row 1
	pdf.CellFormat(25, 6, "STUDENT ID:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 9)
	pdf.CellFormat(55, 6, data.Student.EnrollmentNum, "", 0, "L", false, 0, "")
	
	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(20, 6, "CLASS:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 9)
	pdf.CellFormat(40, 6, fmt.Sprintf("Level %d", data.Student.Level), "", 0, "L", false, 0, "")

	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(20, 6, "TERM:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 9)
	pdf.CellFormat(30, 6, data.Term, "", 0, "L", false, 0, "")
	pdf.Ln(7)

	// Row 2
	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(25, 6, "NAME:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 9)
	pdf.CellFormat(55, 6, fmt.Sprintf("%s %s", string(data.Student.FirstName), string(data.Student.LastName)), "", 0, "L", false, 0, "")

	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(20, 6, "ON ROLL:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 9)
	pdf.CellFormat(40, 6, strconv.Itoa(data.ClassSize), "", 0, "L", false, 0, "")
	
	if data.AcademicYear != "" {
		pdf.SetFont("Arial", "B", 9)
		pdf.CellFormat(20, 6, "ACADEMIC YR:", "", 0, "L", false, 0, "")
		pdf.SetFont("Arial", "", 9)
		pdf.CellFormat(30, 6, data.AcademicYear, "", 0, "L", false, 0, "")
	}
	pdf.Ln(12)

	// 3. Grades Table
	pdf.SetFillColor(241, 245, 249) // Slate 100
	pdf.SetTextColor(15, 23, 42) // Slate 900
	pdf.SetDrawColor(203, 213, 225) // Slate 300
	pdf.SetLineWidth(0.3)
	pdf.SetFont("Arial", "B", 8)
	
	// Adjusted column widths to total 190
	colSubj := 55.0
	colClass := 32.0
	colExam := 32.0
	colTot := 22.0
	colGrd := 14.0
	colRem := 35.0

	pdf.CellFormat(colSubj, 8, "SUBJECT", "1", 0, "C", true, 0, "")
	
	cw := data.Tenant.ClassScoreWeight
	ew := data.Tenant.ExamScoreWeight
	if cw == 0 && ew == 0 {
		cw, ew = 0.5, 0.5
	}

	classScoreHeader := fmt.Sprintf("CLASS (%.0f%%)", cw*100)
	examScoreHeader := fmt.Sprintf("EXAMS (%.0f%%)", ew*100)

	pdf.CellFormat(colClass, 8, classScoreHeader, "1", 0, "C", true, 0, "")
	pdf.CellFormat(colExam, 8, examScoreHeader, "1", 0, "C", true, 0, "")
	pdf.CellFormat(colTot, 8, "TOTAL", "1", 0, "C", true, 0, "")
	pdf.CellFormat(colGrd, 8, "GRD", "1", 0, "C", true, 0, "")
	pdf.CellFormat(colRem, 8, "REMARK", "1", 0, "C", true, 0, "")
	pdf.Ln(8)

	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(51, 65, 85) // Slate 700
	
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
	
	fill := false

	for subject, sg := range subjectMap {
		if fill {
			pdf.SetFillColor(248, 250, 252) // Slate 50
		} else {
			pdf.SetFillColor(255, 255, 255)
		}
		
		pdf.CellFormat(colSubj, 7, "  " + subject, "LRB", 0, "L", true, 0, "")
		pdf.CellFormat(colClass, 7, fmt.Sprintf("%.2f", sg.Class), "LRB", 0, "C", true, 0, "")
		pdf.CellFormat(colExam, 7, fmt.Sprintf("%.2f", sg.Exam), "LRB", 0, "C", true, 0, "")
		
		sg.Total = (sg.Class * cw) + (sg.Exam * ew)
		overallTotal += sg.Total
		subjectCount++

		pdf.SetFont("Arial", "B", 9)
		pdf.CellFormat(colTot, 7, fmt.Sprintf("%.2f", sg.Total), "LRB", 0, "C", true, 0, "")
		
		gradeLetter, remark := getGradeScale(sg.Total)
		pdf.CellFormat(colGrd, 7, gradeLetter, "LRB", 0, "C", true, 0, "")
		pdf.SetFont("Arial", "", 8)
		pdf.CellFormat(colRem, 7, remark, "LRB", 0, "C", true, 0, "")
		pdf.Ln(7)
		fill = !fill
		pdf.SetFont("Arial", "", 9)
	}

	pdf.SetFillColor(241, 245, 249) // Slate 100
	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(colSubj, 8, "OVERALL TOTAL", "1", 0, "C", true, 0, "")
	pdf.CellFormat(colClass+colExam, 8, "", "1", 0, "C", true, 0, "")
	pdf.CellFormat(colTot, 8, fmt.Sprintf("%.2f", overallTotal), "1", 0, "C", true, 0, "")
	overallAvg := float32(0)
	if subjectCount > 0 {
		overallAvg = overallTotal / subjectCount
	}
	ovLetter, _ := getGradeScale(overallAvg)
	pdf.CellFormat(colGrd, 8, ovLetter, "1", 0, "C", true, 0, "")
	pdf.CellFormat(colRem, 8, "", "1", 0, "C", true, 0, "")
	pdf.Ln(14)

	// 4. Attendance & Evaluation
	pdf.SetDrawColor(226, 232, 240) // Slate 200
	
	totalDays := data.Attendance["present"] + data.Attendance["absent"]
	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(35, 7, "ATTENDANCE:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 9)
	pdf.CellFormat(60, 7, fmt.Sprintf("%d OUT OF %d", data.Attendance["present"], totalDays), "", 0, "L", false, 0, "")

	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(35, 7, "PROMOTED TO:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 9)
	pdf.CellFormat(60, 7, data.PromotedTo, "", 0, "L", false, 0, "")
	pdf.Ln(7)

	conduct, attitude, interest, cRemark, hRemark := "", "", "", "", ""
	if data.Evaluation != nil {
		conduct = data.Evaluation.Conduct
		attitude = data.Evaluation.Attitude
		interest = data.Evaluation.Interest
		cRemark = data.Evaluation.ClassTeacherRemark
		hRemark = data.Evaluation.HeadTeacherRemark
	}

	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(35, 7, "CONDUCT:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 9)
	pdf.CellFormat(60, 7, conduct, "", 0, "L", false, 0, "")
	pdf.Ln(7)

	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(35, 7, "ATTITUDE:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 9)
	pdf.CellFormat(60, 7, attitude, "", 0, "L", false, 0, "")
	pdf.Ln(7)

	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(35, 7, "INTEREST:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 9)
	pdf.CellFormat(60, 7, interest, "", 0, "L", false, 0, "")
	pdf.Ln(10)
	
	// Draw line separator
	pdf.Line(pdf.GetX(), pdf.GetY(), pdf.GetX()+190, pdf.GetY())
	pdf.Ln(6)

	// Remarks
	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(190, 6, "CLASS TEACHER'S REMARK:", "", 0, "L", false, 0, "")
	pdf.Ln(5)
	pdf.SetFont("Arial", "I", 9)
	pdf.SetTextColor(71, 85, 105)
	if cRemark == "" { cRemark = "N/A" }
	pdf.MultiCell(190, 6, cRemark, "", "L", false)
	pdf.Ln(4)

	pdf.SetTextColor(51, 65, 85)
	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(190, 6, "HEAD TEACHER'S REMARK:", "", 0, "L", false, 0, "")
	pdf.Ln(5)
	pdf.SetFont("Arial", "I", 9)
	pdf.SetTextColor(71, 85, 105)
	if hRemark == "" { hRemark = "N/A" }
	pdf.MultiCell(190, 6, hRemark, "", "L", false)
	pdf.Ln(16)

	// Signatures
	pdf.SetTextColor(15, 23, 42)
	pdf.SetFont("Arial", "B", 9)
	
	// Pre-calculate signature positions
	sigWidth := 40.0
	classTeacherSigX := 25.0 // Center of 10 to 80 is 45. 45 - 20 = 25
	headTeacherSigX := 135.0 // Center of 120 to 190 is 155. 155 - 20 = 135
	sigYPos := pdf.GetY() - 10
	
	// Draw Class Teacher Signature if available
	if data.ClassTeacher != nil && data.ClassTeacher.SignatureURL != "" {
		s.drawSignature(pdf, data.ClassTeacher.SignatureURL, "class_teacher_sig", classTeacherSigX, sigYPos, sigWidth)
	}
	
	// Draw Headmaster Signature if available
	if data.Tenant != nil && data.Tenant.HeadmasterSignatureURL != "" {
		s.drawSignature(pdf, data.Tenant.HeadmasterSignatureURL, "headmaster_sig", headTeacherSigX, sigYPos, sigWidth)
	}

	// Make space for the signature block
	pdf.Ln(10)
	yPos := pdf.GetY()
	
	// Line for Class Teacher
	pdf.Line(10, yPos, 80, yPos)
	// Line for Head Teacher
	pdf.Line(120, yPos, 190, yPos)
	
	pdf.Ln(2)
	pdf.CellFormat(70, 5, "CLASS TEACHER", "", 0, "C", false, 0, "")
	pdf.CellFormat(40, 5, "", "", 0, "C", false, 0, "")
	pdf.CellFormat(70, 5, "HEAD TEACHER", "", 0, "C", false, 0, "")
	pdf.Ln(16)

	// Next term and legend box
	pdf.SetFillColor(248, 250, 252)
	pdf.SetDrawColor(226, 232, 240)
	pdf.Rect(10, pdf.GetY(), 190, 32, "DF")
	pdf.Ln(4)
	
	pdf.SetX(14)
	if data.NextTermBegins != "" {
		pdf.SetFont("Arial", "B", 8)
		pdf.CellFormat(35, 5, "NEXT TERM BEGINS:", "", 0, "L", false, 0, "")
		pdf.SetFont("Arial", "", 8)
		pdf.CellFormat(100, 5, data.NextTermBegins, "", 0, "L", false, 0, "")
		pdf.Ln(6)
		pdf.SetX(14)
	}

	// Explanations / Legend
	pdf.SetFont("Arial", "B", 7)
	pdf.CellFormat(35, 5, "EXPLANATIONS:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 7)
	pdf.SetTextColor(71, 85, 105)
	pdf.CellFormat(140, 5, "CONDUCT: Behavior towards school rules. | ATTITUDE: Behavior towards learning and others.", "", 0, "L", false, 0, "")
	pdf.Ln(5)
	
	pdf.SetX(14)
	pdf.SetTextColor(15, 23, 42)
	pdf.SetFont("Arial", "B", 7)
	pdf.CellFormat(35, 5, "GRADING LEGEND:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 7)
	pdf.SetTextColor(71, 85, 105)
	pdf.CellFormat(140, 5, "80-100: A (Excellent) | 70-79: B (Very Good) | 60-69: C (Good) | 50-59: D (Pass) | 0-49: F (Fail)", "", 0, "L", false, 0, "")
	pdf.Ln(6)
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
