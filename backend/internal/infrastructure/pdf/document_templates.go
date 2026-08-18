package pdf

import (
	"fmt"
	"time"

	"github.com/jung-kurt/gofpdf"
	"github.com/user/high-school-management/backend/internal/domain"
)

func (s *PDFService) drawHeader(pdf *gofpdf.Fpdf, title string) {
	pdf.SetFont("Arial", "B", 16)
	pdf.CellFormat(190, 10, "ST. AGNES ACADEMY - OFFICIAL RECORD", "", 0, "C", false, 0, "")
	pdf.Ln(10)
	pdf.SetFont("Arial", "B", 12)
	pdf.CellFormat(190, 10, title, "", 0, "C", false, 0, "")
	pdf.Ln(15)
}

func (s *PDFService) drawStudentSection(pdf *gofpdf.Fpdf, student *domain.Student) {
	pdf.SetFont("Arial", "B", 10)
	pdf.Cell(40, 8, "STUDENT NAME:")
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(60, 8, fmt.Sprintf("%s %s", string(student.FirstName), string(student.LastName)))
	pdf.Ln(6)
	pdf.SetFont("Arial", "B", 10)
	pdf.Cell(40, 8, "STUDENT ID:")
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(60, 8, student.ID.String())
	pdf.Ln(6)
	pdf.SetFont("Arial", "B", 10)
	pdf.Cell(40, 8, "DATE OF ISSUE:")
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(60, 8, time.Now().Format("January 02, 2006"))
	pdf.Ln(12)
}

func (s *PDFService) generateEnrollmentCertificate(pdf *gofpdf.Fpdf, student *domain.Student) {
	s.drawHeader(pdf, "Certificate of Enrollment")
	s.drawStudentSection(pdf, student)

	pdf.SetFont("Arial", "", 11)
	text := fmt.Sprintf("This is to certify that %s %s is a duly registered student at St. Agnes Academy for the current academic year. "+
		"The student is currently in good standing and is following the prescribed curriculum.", string(student.FirstName), string(student.LastName))

	pdf.MultiCell(190, 8, text, "", "L", false)
	pdf.Ln(20)

	pdf.SetFont("Arial", "B", 11)
	pdf.Cell(190, 10, "__________________________")
	pdf.Ln(6)
	pdf.Cell(190, 10, "Registrar Official Signature")
}

func (s *PDFService) generateConductReport(pdf *gofpdf.Fpdf, student *domain.Student, attendanceStats map[string]int) {
	s.drawHeader(pdf, "Student Conduct & Attendance Report")
	s.drawStudentSection(pdf, student)

	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(190, 10, "Attendance Summary")
	pdf.Ln(10)

	pdf.SetFont("Arial", "", 11)
	pdf.Cell(60, 8, fmt.Sprintf("Days Present: %d", attendanceStats["present"]))
	pdf.Ln(6)
	pdf.Cell(60, 8, fmt.Sprintf("Days Absent: %d", attendanceStats["absent"]))
	pdf.Ln(6)
	pdf.Cell(60, 8, fmt.Sprintf("Days Tardy: %d", attendanceStats["tardy"]))
	pdf.Ln(15)

	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(190, 10, "Behavioral Evaluation")
	pdf.Ln(10)
	pdf.SetFont("Arial", "", 11)
	pdf.MultiCell(190, 8, "The student has consistently demonstrated respect for school policies and peers. No disciplinary actions are on record for the current period.", "", "L", false)
}

func (s *PDFService) drawBillHeader(pdf *gofpdf.Fpdf, tenantName string) {
	pdf.SetFont("Arial", "B", 18)
	pdf.CellFormat(190, 10, tenantName, "", 0, "C", false, 0, "")
	pdf.Ln(10)
	
	pdf.SetFont("Arial", "", 10)
	// Placeholders for address and contact until they are dynamic
	pdf.CellFormat(190, 6, "Address and Contact Info Here", "", 0, "C", false, 0, "")
	pdf.Ln(15)

	pdf.SetFont("Arial", "BU", 14)
	pdf.CellFormat(190, 10, "PUPIL BILL FOR TERM", "", 0, "C", false, 0, "")
	pdf.Ln(15)
}

func (s *PDFService) drawBillStudentInfo(pdf *gofpdf.Fpdf, student *domain.Student) {
	pdf.SetFont("Arial", "B", 10)
	pdf.Cell(25, 8, "STUDENT ID:")
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(65, 8, student.EnrollmentNum)
	
	pdf.SetFont("Arial", "B", 10)
	pdf.Cell(20, 8, "NAME:")
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(80, 8, fmt.Sprintf("%s %s", string(student.FirstName), string(student.LastName)))
	pdf.Ln(8)

	pdf.SetFont("Arial", "B", 10)
	pdf.Cell(25, 8, "ISSUANCE DATE:")
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(65, 8, time.Now().Format("02 Jan 2006"))

	pdf.SetFont("Arial", "B", 10)
	pdf.Cell(20, 8, "CLASS:")
	pdf.SetFont("Arial", "", 10)
	// Using Level as class placeholder for now
	pdf.Cell(80, 8, fmt.Sprintf("Level %d", student.Level))
	pdf.Ln(12)
}

func (s *PDFService) drawBillTable(pdf *gofpdf.Fpdf, records []domain.FiscalRecord) {
	pdf.SetFont("Arial", "B", 12)
	pdf.CellFormat(190, 10, "BILL", "", 0, "C", false, 0, "")
	pdf.Ln(10)

	pdf.SetFillColor(230, 230, 230)
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(100, 8, "DESCRIPTION", "1", 0, "C", true, 0, "")
	pdf.CellFormat(45, 8, "GHc", "1", 0, "C", true, 0, "")
	pdf.CellFormat(45, 8, "GHc", "1", 0, "C", true, 0, "")
	pdf.Ln(8)

	pdf.SetFont("Arial", "", 10)
	var totalBill float64 = 0

	// Deduplicate breakdown items across multiple records (e.g., if there are multiple unpaid records)
	// We'll aggregate them dynamically based on the FiscalRecord breakdowns.
	breakdownMap := make(map[string]float64)
	for _, record := range records {
		if record.Status != domain.PaymentStatusPaid {
			for _, item := range record.Breakdown {
				breakdownMap[string(item.Category)] += item.Amount
			}
			// If breakdown is empty, use the record's main amount and category
			if len(record.Breakdown) == 0 {
				breakdownMap[string(record.Category)] += record.Amount
			}
		}
	}

	for category, amount := range breakdownMap {
		pdf.CellFormat(100, 8, category, "1", 0, "C", false, 0, "")
		pdf.CellFormat(45, 8, fmt.Sprintf("%.2f", amount), "1", 0, "C", false, 0, "")
		pdf.CellFormat(45, 8, "", "1", 0, "C", false, 0, "")
		pdf.Ln(8)
		totalBill += amount
	}

	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(100, 8, "TOTAL BILL", "1", 0, "C", true, 0, "")
	pdf.CellFormat(45, 8, "-", "1", 0, "C", true, 0, "")
	pdf.CellFormat(45, 8, fmt.Sprintf("%.2f", totalBill), "1", 0, "C", true, 0, "")
	pdf.Ln(8)

	pdf.CellFormat(100, 8, "TOTAL DUE:", "", 0, "L", false, 0, "")
	pdf.Ln(15)
}

func (s *PDFService) drawBillToiletries(pdf *gofpdf.Fpdf) {
	pdf.SetFont("Arial", "BU", 10)
	pdf.CellFormat(190, 8, "OTHER SERVICE CHARGES AND TOILETRIES", "", 0, "C", false, 0, "")
	pdf.Ln(10)

	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(190, 8, "TOILETRIES", "", 0, "C", false, 0, "")
	pdf.Ln(8)

	pdf.SetFont("Arial", "", 9)
	pdf.CellFormat(47.5, 8, "ANTISEPTIC 250ML : 2", "1", 0, "C", false, 0, "")
	pdf.CellFormat(47.5, 8, "1KG WASHING POWDER : 1", "1", 0, "C", false, 0, "")
	pdf.CellFormat(47.5, 8, "SOAP : 3", "1", 0, "C", false, 0, "")
	pdf.CellFormat(47.5, 8, "TOILET PAPER : 3", "1", 0, "C", false, 0, "")
	pdf.Ln(12)

	pdf.SetFont("Arial", "I", 9)
	pdf.MultiCell(190, 6, "Toiletries should be ready the first day your young ELITE will report.\n\nPayment should be made using your child USSD code or app.schoolrobot.net.\n\nNO PHYSICAL PAYMENT TO SCHOOL STAFF.\n\nPayment can be made in advance to enhance flexible payment.", "", "L", false)
}
