package pdf

import (
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jung-kurt/gofpdf"
	"github.com/user/high-school-management/backend/internal/domain"
)

type PDFService struct{}

func NewPDFService() *PDFService {
	return &PDFService{}
}

func (s *PDFService) GenerateDocument(w io.Writer, docType domain.DocumentType, student *domain.Student, grades []domain.Grade, attendanceStats map[string]int) error {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	switch docType {
	case domain.DocTranscript:
		s.drawTranscript(pdf, student, grades, attendanceStats)
	case domain.DocEnrollmentCertificate:
		s.generateEnrollmentCertificate(pdf, student)
	case domain.DocConductReport:
		s.generateConductReport(pdf, student, attendanceStats)
	default:
		return fmt.Errorf("unsupported document type: %s", docType)
	}

	// Dynamic Footer for all documents
	pdf.SetY(-30)
	pdf.SetFont("Arial", "I", 8)
	pdf.CellFormat(190, 10, fmt.Sprintf("Generated on %s | Student Support Hub | Document Ref: %s-%s",
		fmt.Sprint(student.CreatedAt.Format("2006-01-02")), docType, student.ID.String()), "", 0, "C", false, 0, "")

	return pdf.Output(w)
}

func (s *PDFService) drawWatermark(pdf *gofpdf.Fpdf, logoURL string) {
	if logoURL == "" {
		return
	}

	// Download the image
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(logoURL)
	if err != nil || resp.StatusCode != http.StatusOK {
		if resp != nil {
			resp.Body.Close()
		}
		return
	}
	defer resp.Body.Close()

	// Determine image type from URL extension or Content-Type
	imgType := ""
	if strings.HasSuffix(strings.ToLower(logoURL), ".png") || strings.Contains(resp.Header.Get("Content-Type"), "png") {
		imgType = "PNG"
	} else if strings.HasSuffix(strings.ToLower(logoURL), ".jpg") || strings.HasSuffix(strings.ToLower(logoURL), ".jpeg") || strings.Contains(resp.Header.Get("Content-Type"), "jpeg") {
		imgType = "JPG"
	} else {
		// Default to JPG if unknown, gofpdf can be picky
		imgType = "JPG"
	}

	// Register image in memory
	opt := gofpdf.ImageOptions{ImageType: imgType, ReadDpi: false}
	imgName := "watermark_logo"
	pdf.RegisterImageOptionsReader(imgName, opt, resp.Body)

	// Save state, set transparency, draw image, restore state
	pdf.SetAlpha(0.1, "Normal")
	
	// A4 is 210 x 297 mm. We want the logo centered and reasonably large.
	w := 120.0
	h := 120.0
	x := (210.0 - w) / 2.0
	y := (297.0 - h) / 2.0

	pdf.ImageOptions(imgName, x, y, w, h, false, opt, 0, "")
	
	// Reset alpha to fully opaque for text
	pdf.SetAlpha(1.0, "Normal")
}

func (s *PDFService) drawSignature(pdf *gofpdf.Fpdf, url string, imgName string, x, y, w float64) {
	if url == "" {
		return
	}

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(url)
	if err != nil || resp.StatusCode != http.StatusOK {
		if resp != nil {
			resp.Body.Close()
		}
		return
	}
	defer resp.Body.Close()

	imgType := ""
	if strings.HasSuffix(strings.ToLower(url), ".png") || strings.Contains(resp.Header.Get("Content-Type"), "png") {
		imgType = "PNG"
	} else if strings.HasSuffix(strings.ToLower(url), ".jpg") || strings.HasSuffix(strings.ToLower(url), ".jpeg") || strings.Contains(resp.Header.Get("Content-Type"), "jpeg") {
		imgType = "JPG"
	} else {
		imgType = "JPG"
	}

	opt := gofpdf.ImageOptions{ImageType: imgType, ReadDpi: false}
	pdf.RegisterImageOptionsReader(imgName, opt, resp.Body)

	// Keep aspect ratio: set h to 0
	pdf.ImageOptions(imgName, x, y, w, 0, false, opt, 0, "")
}

func (s *PDFService) drawTranscript(pdf *gofpdf.Fpdf, student *domain.Student, grades []domain.Grade, attendanceStats map[string]int) {
	s.drawHeader(pdf, "Official Academic Transcript")
	s.drawStudentSection(pdf, student)

	// Grades Table Header
	pdf.SetFillColor(240, 240, 240)
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(80, 10, "Subject", "1", 0, "C", true, 0, "")
	pdf.CellFormat(40, 10, "Grade", "1", 0, "C", true, 0, "")
	pdf.CellFormat(70, 10, "Remarks", "1", 0, "C", true, 0, "")
	pdf.Ln(10)

	// Grades Data
	pdf.SetFont("Arial", "", 10)
	for _, g := range grades {
		pdf.CellFormat(80, 10, g.Subject, "1", 0, "L", false, 0, "")
		pdf.CellFormat(40, 10, fmt.Sprintf("%.2f", g.Value), "1", 0, "C", false, 0, "")
		pdf.CellFormat(70, 10, g.Remarks, "1", 0, "L", false, 0, "")
		pdf.Ln(10)
	}
	pdf.Ln(10)

	// Attendance Summary
	pdf.SetFont("Arial", "B", 10)
	pdf.Cell(190, 8, "Attendance Summary")
	pdf.Ln(8)
	pdf.Cell(40, 8, "STUDENT NAME:")
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(60, 8, fmt.Sprintf("%s %s", string(student.FirstName), string(student.LastName)))
	pdf.Ln(8)
	pdf.Cell(40, 8, fmt.Sprintf("Present: %d", attendanceStats["present"]))
	pdf.Cell(40, 8, fmt.Sprintf("Absent: %d", attendanceStats["absent"]))
	pdf.Cell(40, 8, fmt.Sprintf("Tardy: %d", attendanceStats["tardy"]))
}

func (s *PDFService) GenerateTranscript(w io.Writer, student *domain.Student, grades []domain.Grade, attendanceStats map[string]int) error {
	return s.GenerateDocument(w, domain.DocTranscript, student, grades, attendanceStats)
}

func (s *PDFService) GenerateTerminalReport(w io.Writer, data TerminalReportData) error {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	s.drawTerminalReport(pdf, data)

	// Dynamic Footer for terminal report
	pdf.SetY(-30)
	pdf.SetFont("Arial", "I", 8)
	pdf.CellFormat(190, 10, fmt.Sprintf("SOFTWARE BY: THINKCE | Generated on %s | Document Ref: TR-%s",
		time.Now().Format("2006-01-02"), data.Student.ID.String()), "", 0, "C", false, 0, "")

	return pdf.Output(w)
}

// Phase 19: Gradebook Export
func (s *PDFService) GenerateGradebookReport(w io.Writer, class *domain.Class, term string, students []domain.Student, gpas []domain.GradeWeightedGPA) error {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	s.drawHeader(pdf, fmt.Sprintf("Official Gradebook - %s", class.Name))

	pdf.SetFont("Arial", "", 12)

	// Gracefully handle missing teacher preloads
	teacherName := "N/A"
	if class.Teacher != nil {
		teacherName = fmt.Sprintf("%s %s", string(class.Teacher.FirstName), string(class.Teacher.LastName))
	}

	pdf.CellFormat(190, 8, fmt.Sprintf("Term: %s | Teacher: %s", term, teacherName), "", 0, "C", false, 0, "")
	pdf.Ln(12)

	// Grades Table Header
	pdf.SetFillColor(240, 240, 240)
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(90, 10, "Student Name", "1", 0, "C", true, 0, "")
	pdf.CellFormat(50, 10, "Student ID", "1", 0, "C", true, 0, "")
	pdf.CellFormat(50, 10, "Weighted GPA", "1", 0, "C", true, 0, "")
	pdf.Ln(10)

	// Grades Data
	pdf.SetFont("Arial", "", 11)

	gpaMap := make(map[uuid.UUID]float64)
	for _, g := range gpas {
		gpaMap[g.StudentID] = g.GPA
	}

	for _, st := range students {
		pdf.CellFormat(90, 10, fmt.Sprintf("%s %s", string(st.FirstName), string(st.LastName)), "1", 0, "L", false, 0, "")
		pdf.CellFormat(50, 10, fmt.Sprintf("%s", st.EnrollmentNum), "1", 0, "C", false, 0, "")

		gpaStr := "N/A"
		if gpa, ok := gpaMap[st.ID]; ok {
			gpaStr = fmt.Sprintf("%.2f%%", gpa)
		}

		pdf.CellFormat(50, 10, gpaStr, "1", 0, "C", false, 0, "")
		pdf.Ln(10)
	}

	// Dynamic Footer
	pdf.SetY(-30)
	pdf.SetFont("Arial", "I", 8)
	pdf.CellFormat(190, 10, fmt.Sprintf("Generated on %s | Academic Records Hub", time.Now().Format("2006-01-02")), "", 0, "C", false, 0, "")

	return pdf.Output(w)
}

// Student ID Card Generation (Feature 13)
func (s *PDFService) GenerateStudentIDCard(w io.Writer, student *domain.Student, schoolName string) error {
	// Card dimensions: CR-80 standard (85.6mm x 53.98mm)
	pdf := gofpdf.NewCustom(&gofpdf.InitType{
		OrientationStr: "L",
		UnitStr:        "mm",
		Size:           gofpdf.SizeType{Wd: 85.6, Ht: 53.98},
	})
	pdf.SetMargins(0, 0, 0)
	pdf.AddPage()

	// Card Background
	pdf.SetFillColor(30, 30, 60)
	pdf.Rect(0, 0, 85.6, 53.98, "F")

	// Header strip
	pdf.SetFillColor(79, 70, 229) // Indigo accent
	pdf.Rect(0, 0, 85.6, 14, "F")

	// School Name
	pdf.SetFont("Arial", "B", 9)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetXY(4, 3)
	pdf.CellFormat(77.6, 4, schoolName, "", 0, "C", false, 0, "")

	// "STUDENT ID" label
	pdf.SetFont("Arial", "", 6)
	pdf.SetXY(4, 8)
	pdf.CellFormat(77.6, 4, "STUDENT IDENTIFICATION CARD", "", 0, "C", false, 0, "")

	// Photo placeholder box
	pdf.SetFillColor(50, 50, 80)
	pdf.Rect(5, 18, 20, 24, "F")
	pdf.SetFont("Arial", "", 6)
	pdf.SetTextColor(150, 150, 180)
	pdf.SetXY(5, 26)
	pdf.CellFormat(20, 6, "PHOTO", "", 0, "C", false, 0, "")

	// Student details
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 10)
	pdf.SetXY(28, 18)
	pdf.CellFormat(54, 5, fmt.Sprintf("%s %s", string(student.FirstName), string(student.LastName)), "", 0, "L", false, 0, "")

	pdf.SetFont("Arial", "", 7)
	pdf.SetTextColor(180, 180, 210)

	pdf.SetXY(28, 24)
	pdf.CellFormat(54, 4, fmt.Sprintf("ID: %s", student.EnrollmentNum), "", 0, "L", false, 0, "")

	pdf.SetXY(28, 29)
	pdf.CellFormat(54, 4, fmt.Sprintf("Level: %d | Year: %s", student.Level, student.AcademicYear), "", 0, "L", false, 0, "")

	pdf.SetXY(28, 34)
	pdf.CellFormat(54, 4, fmt.Sprintf("Status: %s", student.Status), "", 0, "L", false, 0, "")

	// Reference / QR placeholder bar
	pdf.SetFillColor(40, 40, 70)
	pdf.Rect(0, 44, 85.6, 9.98, "F")
	pdf.SetFont("Arial", "B", 7)
	pdf.SetTextColor(130, 130, 180)
	pdf.SetXY(4, 46)
	pdf.CellFormat(77.6, 4, fmt.Sprintf("REF: %s | Generated: %s", student.ID.String()[:8], time.Now().Format("2006-01-02")), "", 0, "C", false, 0, "")

	return pdf.Output(w)
}

// GeneratePayslip generates a PDF payslip for a staff member
func (s *PDFService) GeneratePayslip(w io.Writer, pr *domain.PayrollRecord) error {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	// Header
	pdf.SetFont("Arial", "B", 16)
	pdf.CellFormat(190, 10, "Official Payslip", "", 0, "C", false, 0, "")
	pdf.Ln(15)

	// Staff Details
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(40, 8, "Staff Name:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 10)
	if pr.Staff != nil {
		pdf.CellFormat(60, 8, fmt.Sprintf("%s %s", string(pr.Staff.FirstName), string(pr.Staff.LastName)), "", 0, "L", false, 0, "")
	} else {
		pdf.CellFormat(60, 8, pr.StaffID.String(), "", 0, "L", false, 0, "")
	}
	pdf.Ln(8)

	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(40, 8, "Period:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(60, 8, fmt.Sprintf("%02d/%d", pr.PeriodMonth, pr.PeriodYear), "", 0, "L", false, 0, "")
	pdf.Ln(15)

	// Payroll Breakdown Table Header
	pdf.SetFillColor(240, 240, 240)
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(95, 10, "Description", "1", 0, "C", true, 0, "")
	pdf.CellFormat(95, 10, "Amount (GHS)", "1", 0, "C", true, 0, "")
	pdf.Ln(10)

	// Data Rows
	pdf.SetFont("Arial", "", 10)
	
	// Base Pay
	pdf.CellFormat(95, 10, "Base Salary", "1", 0, "L", false, 0, "")
	pdf.CellFormat(95, 10, fmt.Sprintf("%.2f", pr.GrossPay), "1", 0, "R", false, 0, "")
	pdf.Ln(10)

	// Additions / Allowances
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(190, 10, "Allowances & Additions", "1", 0, "L", true, 0, "")
	pdf.Ln(10)
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(95, 10, "Total Allowances", "1", 0, "L", false, 0, "")
	pdf.CellFormat(95, 10, fmt.Sprintf("%.2f", pr.Allowances), "1", 0, "R", false, 0, "")
	pdf.Ln(10)

	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(95, 10, "Gross Pay", "1", 0, "L", true, 0, "")
	pdf.CellFormat(95, 10, fmt.Sprintf("%.2f", pr.GrossPay+pr.Allowances), "1", 0, "R", true, 0, "")
	pdf.Ln(10)

	// Deductions
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(190, 10, "Deductions & Taxes", "1", 0, "L", true, 0, "")
	pdf.Ln(10)
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(95, 10, "Total Deductions", "1", 0, "L", false, 0, "")
	pdf.CellFormat(95, 10, fmt.Sprintf("%.2f", pr.Deductions), "1", 0, "R", false, 0, "")
	pdf.Ln(10)

	// Net Pay
	pdf.SetFont("Arial", "B", 12)
	pdf.CellFormat(95, 12, "Net Pay", "1", 0, "L", true, 0, "")
	pdf.CellFormat(95, 12, fmt.Sprintf("%.2f", pr.NetPay), "1", 0, "R", true, 0, "")
	pdf.Ln(15)

	// Footer
	pdf.SetFont("Arial", "I", 8)
	pdf.CellFormat(190, 10, fmt.Sprintf("Generated on %s | Document Ref: PR-%s", time.Now().Format("2006-01-02"), pr.ID.String()), "", 0, "C", false, 0, "")

	return pdf.Output(w)
}

// GeneratePupilBill generates a printable bill for a student
func (s *PDFService) GeneratePupilBill(w io.Writer, tenantName string, tenant *domain.Tenant, student *domain.Student, records []domain.FiscalRecord) error {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	if tenant != nil && tenant.LogoURL != "" {
		s.drawWatermark(pdf, tenant.LogoURL)
	}

	s.drawBillHeader(pdf, tenantName)
	s.drawBillStudentInfo(pdf, student)
	s.drawBillTable(pdf, records)
	s.drawBillToiletries(pdf)

	pdf.SetY(-30)
	pdf.SetFont("Arial", "I", 8)
	pdf.CellFormat(190, 10, fmt.Sprintf("Generated on %s | Academic Records Hub", time.Now().Format("2006-01-02")), "", 0, "C", false, 0, "")

	return pdf.Output(w)
}



// StudentBillData holds data for a single student's bill
type StudentBillData struct {
	Student *domain.Student
	Records []domain.FiscalRecord
}

// GenerateBulkPupilBills generates a printable multi-page bill for multiple students
func (s *PDFService) GenerateBulkPupilBills(w io.Writer, tenantName string, tenant *domain.Tenant, bills []StudentBillData) error {
	pdf := gofpdf.New("P", "mm", "A4", "")

	for _, bill := range bills {
		pdf.AddPage()
		if tenant != nil && tenant.LogoURL != "" {
			s.drawWatermark(pdf, tenant.LogoURL)
		}
		s.drawBillHeader(pdf, tenantName)
		s.drawBillStudentInfo(pdf, bill.Student)
		s.drawBillTable(pdf, bill.Records)
		s.drawBillToiletries(pdf)

		// Dynamic Footer
		pdf.SetY(-30)
		pdf.SetFont("Arial", "I", 8)
		pdf.CellFormat(190, 10, fmt.Sprintf("Generated on %s | Finance Department", time.Now().Format("2006-01-02")), "", 0, "C", false, 0, "")
	}

	return pdf.Output(w)
}

// GeneratePaymentReceipt generates a printable payment receipt for a single fiscal record.
// It is only meaningful when amount_paid > 0 (partial or full payment).
func (s *PDFService) GeneratePaymentReceipt(w io.Writer, tenantName string, tenant *domain.Tenant, record *domain.FiscalRecord) error {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()
	pdf.SetMargins(15, 15, 15)

	if tenant != nil && tenant.LogoURL != "" {
		s.drawWatermark(pdf, tenant.LogoURL)
	}

	// ── Header band ──────────────────────────────────────────────────────────
	pdf.SetFillColor(30, 41, 59)
	pdf.Rect(0, 0, 210, 38, "F")

	pdf.SetFont("Arial", "B", 18)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetXY(15, 8)
	pdf.CellFormat(180, 10, tenantName, "", 0, "C", false, 0, "")

	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(148, 163, 184)
	pdf.SetXY(15, 20)
	pdf.CellFormat(180, 6, "OFFICIAL PAYMENT RECEIPT", "", 0, "C", false, 0, "")

	receiptType := "PARTIAL PAYMENT RECEIPT"
	var badgeR, badgeG, badgeB int = 99, 102, 241
	if record.Status == domain.PaymentStatusPaid {
		receiptType = "FULL PAYMENT RECEIPT"
		badgeR, badgeG, badgeB = 16, 185, 129
	}
	pdf.SetFillColor(badgeR, badgeG, badgeB)
	pdf.RoundedRect(60, 28, 90, 7, 2, "1234", "F")
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetXY(60, 29)
	pdf.CellFormat(90, 5, receiptType, "", 0, "C", false, 0, "")

	// ── Receipt meta ─────────────────────────────────────────────────────────
	pdf.SetTextColor(30, 41, 59)
	pdf.SetFont("Arial", "", 9)
	receiptNum := "RCP-" + record.ID.String()[:8]
	pdf.SetXY(15, 44)
	pdf.CellFormat(90, 6, "Receipt No:  "+receiptNum, "", 0, "L", false, 0, "")
	pdf.SetXY(105, 44)
	pdf.CellFormat(90, 6, "Date:  "+time.Now().Format("02 Jan 2006  15:04"), "", 0, "R", false, 0, "")

	pdf.SetDrawColor(226, 232, 240)
	pdf.SetLineWidth(0.4)
	pdf.Line(15, 53, 195, 53)

	// ── Student info box ──────────────────────────────────────────────────────
	pdf.SetFillColor(248, 250, 252)
	pdf.RoundedRect(15, 56, 180, 32, 3, "1234", "F")
	pdf.SetDrawColor(226, 232, 240)
	pdf.RoundedRect(15, 56, 180, 32, 3, "1234", "D")

	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(100, 116, 139)
	pdf.SetXY(20, 60)
	pdf.CellFormat(80, 5, "STUDENT DETAILS", "", 0, "L", false, 0, "")

	studentName := "N/A"
	if record.Student != nil {
		studentName = fmt.Sprintf("%s %s", string(record.Student.FirstName), string(record.Student.LastName))
	}

	pdf.SetFont("Arial", "B", 12)
	pdf.SetTextColor(15, 23, 42)
	pdf.SetXY(20, 67)
	pdf.CellFormat(120, 7, studentName, "", 0, "L", false, 0, "")

	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(71, 85, 105)
	pdf.SetXY(20, 76)
	termLabel := record.TermName
	if termLabel == "" {
		termLabel = "—"
	}
	pdf.CellFormat(80, 5, "Category:  "+string(record.Category), "", 0, "L", false, 0, "")
	pdf.SetXY(110, 76)
	pdf.CellFormat(80, 5, "Term:  "+termLabel, "", 0, "L", false, 0, "")

	// ── Payment summary ───────────────────────────────────────────────────────
	pdf.SetXY(15, 96)
	pdf.SetFont("Arial", "B", 9)
	pdf.SetTextColor(100, 116, 139)
	pdf.CellFormat(180, 6, "PAYMENT SUMMARY", "", 0, "L", false, 0, "")
	pdf.Line(15, 104, 195, 104)

	balanceDue := record.Amount - record.AmountPaid
	if balanceDue < 0 {
		balanceDue = 0
	}

	summaryRows := []struct {
		label string
		value string
		bold  bool
	}{
		{"Total Fee", fmt.Sprintf("GHS %.2f", record.Amount), false},
		{"Amount Paid", fmt.Sprintf("GHS %.2f", record.AmountPaid), false},
		{"Balance Due", fmt.Sprintf("GHS %.2f", balanceDue), false},
		{"Payment Status", string(record.Status), true},
	}

	y := 107.0
	for _, row := range summaryRows {
		pdf.SetXY(15, y)
		if row.bold {
			pdf.SetFont("Arial", "B", 10)
			pdf.SetTextColor(15, 23, 42)
		} else {
			pdf.SetFont("Arial", "", 10)
			pdf.SetTextColor(51, 65, 85)
		}
		pdf.CellFormat(100, 7, row.label, "", 0, "L", false, 0, "")
		pdf.SetFont("Arial", "B", 10)
		pdf.SetTextColor(15, 23, 42)
		pdf.SetXY(115, y)
		pdf.CellFormat(80, 7, row.value, "", 0, "R", false, 0, "")
		y += 8
	}

	y += 3
	pdf.SetFillColor(badgeR, badgeG, badgeB)
	pdf.RoundedRect(15, y, 180, 12, 2, "1234", "F")
	pdf.SetFont("Arial", "B", 12)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetXY(20, y+2.5)
	pdf.CellFormat(85, 7, "AMOUNT RECEIVED", "", 0, "L", false, 0, "")
	pdf.SetXY(105, y+2.5)
	pdf.CellFormat(85, 7, fmt.Sprintf("GHS %.2f", record.AmountPaid), "", 0, "R", false, 0, "")

	// ── Breakdown ─────────────────────────────────────────────────────────────
	if len(record.Breakdown) > 0 {
		y += 20
		pdf.SetXY(15, y)
		pdf.SetFont("Arial", "B", 9)
		pdf.SetTextColor(100, 116, 139)
		pdf.CellFormat(180, 6, "FEE BREAKDOWN", "", 0, "L", false, 0, "")
		pdf.Line(15, y+7, 195, y+7)
		y += 10
		pdf.SetFont("Arial", "", 9)
		pdf.SetTextColor(51, 65, 85)
		for _, b := range record.Breakdown {
			pdf.SetXY(20, y)
			pdf.CellFormat(100, 6, "• "+string(b.Category), "", 0, "L", false, 0, "")
			pdf.SetXY(120, y)
			pdf.CellFormat(75, 6, fmt.Sprintf("GHS %.2f", b.Amount), "", 0, "R", false, 0, "")
			y += 7
		}
	}

	// ── Dashed cut line ───────────────────────────────────────────────────────
	pdf.SetDrawColor(203, 213, 225)
	pdf.SetDashPattern([]float64{2, 2}, 0)
	pdf.Line(15, 250, 195, 250)
	pdf.SetDashPattern([]float64{}, 0)
	pdf.SetFont("Arial", "I", 7)
	pdf.SetTextColor(148, 163, 184)
	pdf.SetXY(15, 251)
	pdf.CellFormat(180, 4, "Keep this receipt for your records", "", 0, "C", false, 0, "")

	// ── Footer ────────────────────────────────────────────────────────────────
	pdf.SetY(-20)
	pdf.SetFont("Arial", "I", 8)
	pdf.SetTextColor(148, 163, 184)
	pdf.CellFormat(190, 6, fmt.Sprintf("Generated on %s | %s Finance Dept | Ref: %s", time.Now().Format("2006-01-02 15:04"), tenantName, receiptNum), "", 0, "C", false, 0, "")

	return pdf.Output(w)
}

// GenerateExecutiveReportPDF creates a high-level summary PDF for administrators
type ExecutiveStats struct {
	TotalStudents int
	Active        int
	AttendPresent int
	AttendAbsent  int
	AttendTardy   int
	AtRiskCount   int
	HighRiskCount int
	TopRisks      []string // Names of top 5 at-risk students
}

func (s *PDFService) GenerateExecutiveReportPDF(stats ExecutiveStats) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 15, 15)
	pdf.AddPage()

	// ── Header ────────────────────────────────────────────────────────────────
	pdf.SetFillColor(15, 23, 42)
	pdf.Rect(0, 0, 210, 40, "F")
	pdf.SetFont("Arial", "B", 20)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetXY(15, 12)
	pdf.CellFormat(180, 10, "Executive School Report", "", 0, "C", false, 0, "")
	pdf.SetFont("Arial", "", 10)
	pdf.SetXY(15, 24)
	pdf.SetTextColor(148, 163, 184)
	pdf.CellFormat(180, 8, fmt.Sprintf("Generated: %s", time.Now().Format("January 2, 2006 · 15:04")), "", 0, "C", false, 0, "")

	y := 52.0

	// ── KPI Cards ─────────────────────────────────────────────────────────────
	kpis := []struct {
		Label string
		Value string
		Color [3]int
	}{
		{"Total Students", fmt.Sprintf("%d", stats.TotalStudents), [3]int{99, 102, 241}},
		{"Active Students", fmt.Sprintf("%d", stats.Active), [3]int{16, 185, 129}},
		{"At-Risk Students", fmt.Sprintf("%d", stats.AtRiskCount), [3]int{245, 158, 11}},
		{"High Risk", fmt.Sprintf("%d", stats.HighRiskCount), [3]int{239, 68, 68}},
	}

	cardW := 42.5
	for i, kpi := range kpis {
		x := 15.0 + float64(i)*cardW
		pdf.SetFillColor(30, 41, 59)
		pdf.RoundedRect(x, y, 40, 28, 3, "1234", "F")
		pdf.SetTextColor(kpi.Color[0], kpi.Color[1], kpi.Color[2])
		pdf.SetFont("Arial", "B", 18)
		pdf.SetXY(x, y+6)
		pdf.CellFormat(40, 10, kpi.Value, "", 0, "C", false, 0, "")
		pdf.SetTextColor(148, 163, 184)
		pdf.SetFont("Arial", "", 8)
		pdf.SetXY(x, y+18)
		pdf.CellFormat(40, 6, kpi.Label, "", 0, "C", false, 0, "")
	}

	y += 38

	// ── Attendance Summary ─────────────────────────────────────────────────────
	pdf.SetTextColor(241, 245, 249)
	pdf.SetFont("Arial", "B", 13)
	pdf.SetXY(15, y)
	pdf.CellFormat(180, 10, "Attendance Overview", "", 1, "L", false, 0, "")
	y += 12

	total := stats.AttendPresent + stats.AttendAbsent + stats.AttendTardy
	if total == 0 {
		total = 1 // avoid div by zero
	}
	rows := [][]string{
		{"Present", fmt.Sprintf("%d records", stats.AttendPresent), fmt.Sprintf("%.1f%%", float64(stats.AttendPresent)/float64(total)*100)},
		{"Absent", fmt.Sprintf("%d records", stats.AttendAbsent), fmt.Sprintf("%.1f%%", float64(stats.AttendAbsent)/float64(total)*100)},
		{"Tardy", fmt.Sprintf("%d records", stats.AttendTardy), fmt.Sprintf("%.1f%%", float64(stats.AttendTardy)/float64(total)*100)},
	}

	pdf.SetFillColor(30, 41, 59)
	pdf.SetFont("Arial", "B", 9)
	pdf.SetTextColor(148, 163, 184)
	pdf.SetXY(15, y)
	pdf.CellFormat(60, 8, "STATUS", "0", 0, "L", true, 0, "")
	pdf.CellFormat(60, 8, "COUNT", "0", 0, "L", true, 0, "")
	pdf.CellFormat(60, 8, "PERCENTAGE", "0", 1, "L", true, 0, "")
	y += 8

	for _, row := range rows {
		pdf.SetFillColor(15, 23, 42)
		pdf.SetFont("Arial", "", 10)
		pdf.SetTextColor(241, 245, 249)
		pdf.SetXY(15, y)
		pdf.CellFormat(60, 8, row[0], "0", 0, "L", true, 0, "")
		pdf.CellFormat(60, 8, row[1], "0", 0, "L", true, 0, "")
		pdf.CellFormat(60, 8, row[2], "0", 1, "L", true, 0, "")
		y += 8
	}

	y += 8

	// ── Top At-Risk Students ─────────────────────────────────────────────────
	if len(stats.TopRisks) > 0 {
		pdf.SetTextColor(241, 245, 249)
		pdf.SetFont("Arial", "B", 13)
		pdf.SetXY(15, y)
		pdf.CellFormat(180, 10, "Top At-Risk Students", "", 1, "L", false, 0, "")
		y += 12

		for i, name := range stats.TopRisks {
			pdf.SetFillColor(30, 41, 59)
			pdf.SetFont("Arial", "", 10)
			pdf.SetTextColor(239, 68, 68)
			pdf.SetXY(15, y)
			pdf.CellFormat(10, 8, fmt.Sprintf("%d.", i+1), "0", 0, "L", true, 0, "")
			pdf.SetTextColor(241, 245, 249)
			pdf.CellFormat(170, 8, name, "0", 1, "L", true, 0, "")
			y += 8
		}
	}

	// ── Footer ────────────────────────────────────────────────────────────────
	pdf.SetY(-20)
	pdf.SetFont("Arial", "I", 8)
	pdf.SetTextColor(148, 163, 184)
	pdf.CellFormat(190, 6, "Confidential — School Administration Use Only | "+time.Now().Format("2006-01-02"), "", 0, "C", false, 0, "")

	var buf []byte
	var writer bytesWriter
	if err := pdf.Output(&writer); err != nil {
		return nil, err
	}
	buf = writer.Bytes()
	return buf, nil
}

type bytesWriter struct {
	data []byte
}

func (b *bytesWriter) Write(p []byte) (n int, err error) {
	b.data = append(b.data, p...)
	return len(p), nil
}

func (b *bytesWriter) Bytes() []byte {
	return b.data
}

// ensure uuid import is used
var _ = uuid.Nil
