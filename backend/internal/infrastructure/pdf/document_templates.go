package pdf

import (
	"fmt"
	"strings"
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

func (s *PDFService) drawBillHeader(pdf *gofpdf.Fpdf, tenantName string, tenant *domain.Tenant, config *domain.BillTemplateConfig, termName string) {
	// Top primary bar
	pdf.SetFillColor(30, 41, 59) // Slate 800
	pdf.Rect(0, 0, 210, 4, "F")

	pdf.SetY(8)
	// School Name
	pdf.SetFont("Arial", "B", 18)
	pdf.SetTextColor(30, 41, 59)
	pdf.CellFormat(190, 8, tenantName, "", 1, "C", false, 0, "")

	// Motto if available
	if tenant != nil && tenant.Motto != "" {
		pdf.SetFont("Arial", "I", 9)
		pdf.SetTextColor(100, 116, 139)
		pdf.CellFormat(190, 5, fmt.Sprintf(`"%s"`, tenant.Motto), "", 1, "C", false, 0, "")
	}

	// Address and contact details
	contactParts := []string{}
	if tenant != nil {
		if tenant.Address != "" {
			contactParts = append(contactParts, tenant.Address)
		}
		if tenant.ContactNumbers != "" {
			contactParts = append(contactParts, "Tel: "+tenant.ContactNumbers)
		}
		if tenant.Email != "" {
			contactParts = append(contactParts, "Email: "+tenant.Email)
		}
	}
	contactLine := strings.Join(contactParts, "  |  ")
	if contactLine == "" {
		contactLine = "Official Institutional Billing & Student Accounts"
	}
	pdf.SetFont("Arial", "", 8.5)
	pdf.SetTextColor(100, 116, 139)
	pdf.CellFormat(190, 5, contactLine, "", 1, "C", false, 0, "")

	pdf.Ln(2)

	// Document Title Banner
	title := "PUPIL BILL"
	if config != nil && config.Title != "" {
		title = strings.ToUpper(config.Title)
	}
	if termName != "" && termName != "N/A" {
		if strings.Contains(title, "FOR TERM") {
			title = strings.Replace(title, "FOR TERM", "- "+strings.ToUpper(termName), 1)
		} else if !strings.Contains(title, strings.ToUpper(termName)) {
			title = title + " - " + strings.ToUpper(termName)
		}
	} else if title == "PUPIL BILL" {
		title = "PUPIL BILL FOR TERM"
	}

	pdf.SetFillColor(241, 245, 249) // Slate 100
	pdf.SetDrawColor(203, 213, 225) // Slate 300
	pdf.SetLineWidth(0.3)
	pdf.SetFont("Arial", "B", 11)
	pdf.SetTextColor(15, 23, 42)
	pdf.CellFormat(190, 7.5, title, "1", 1, "C", true, 0, "")
	pdf.Ln(3)
}

func (s *PDFService) drawBillStudentInfo(pdf *gofpdf.Fpdf, student *domain.Student, termName string, academicYear string) {
	studentName := fmt.Sprintf("%s %s", string(student.FirstName), string(student.LastName))
	studentID := student.EnrollmentNum
	if studentID == "" {
		studentID = "N/A"
	}
	className := ""
	if student.Class != nil && student.Class.Name != "" {
		className = student.Class.Name
	} else if student.Level > 0 {
		className = fmt.Sprintf("Level %d", student.Level)
	} else {
		className = "General"
	}

	if termName == "" {
		termName = "Current Term"
	}

	if academicYear == "" {
		academicYear = student.AcademicYear
	}
	if academicYear == "" {
		academicYear = "N/A"
	}

	issuanceDate := time.Now().Format("02 Jan 2006")
	billRef := fmt.Sprintf("BIL-%s", student.ID.String()[:8])

	startY := pdf.GetY()
	pdf.SetFillColor(248, 250, 252) // Slate 50
	pdf.SetDrawColor(226, 232, 240) // Slate 200
	pdf.SetLineWidth(0.3)
	pdf.RoundedRect(10, startY, 190, 25, 2, "1234", "FD")

	// Row 1: Student Name & Bill Ref
	pdf.SetXY(14, startY+2.5)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(100, 116, 139)
	pdf.Cell(28, 4.5, "STUDENT NAME:")
	pdf.SetFont("Arial", "B", 8.5)
	pdf.SetTextColor(15, 23, 42)
	pdf.Cell(65, 4.5, studentName)

	pdf.SetXY(110, startY+2.5)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(100, 116, 139)
	pdf.Cell(28, 4.5, "BILL REFERENCE:")
	pdf.SetFont("Arial", "B", 8.5)
	pdf.SetTextColor(15, 23, 42)
	pdf.Cell(50, 4.5, billRef)

	// Row 2: Student ID & Academic Term
	pdf.SetXY(14, startY+7.5)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(100, 116, 139)
	pdf.Cell(28, 4.5, "STUDENT ID:")
	pdf.SetFont("Arial", "B", 8.5)
	pdf.SetTextColor(79, 70, 229) // Indigo
	pdf.Cell(65, 4.5, studentID)

	pdf.SetXY(110, startY+7.5)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(100, 116, 139)
	pdf.Cell(28, 4.5, "ACADEMIC TERM:")
	pdf.SetFont("Arial", "B", 8.5)
	pdf.SetTextColor(79, 70, 229) // Indigo
	pdf.Cell(50, 4.5, termName)

	// Row 3: Class & Issuance Date
	pdf.SetXY(14, startY+12.5)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(100, 116, 139)
	pdf.Cell(28, 4.5, "CLASS / LEVEL:")
	pdf.SetFont("Arial", "B", 8.5)
	pdf.SetTextColor(15, 23, 42)
	pdf.Cell(65, 4.5, className)

	pdf.SetXY(110, startY+12.5)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(100, 116, 139)
	pdf.Cell(28, 4.5, "ISSUANCE DATE:")
	pdf.SetFont("Arial", "", 8.5)
	pdf.SetTextColor(15, 23, 42)
	pdf.Cell(50, 4.5, issuanceDate)

	// Row 4: Academic Year & Currency
	pdf.SetXY(14, startY+17.5)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(100, 116, 139)
	pdf.Cell(28, 4.5, "ACADEMIC YEAR:")
	pdf.SetFont("Arial", "B", 8.5)
	pdf.SetTextColor(15, 23, 42)
	pdf.Cell(65, 4.5, academicYear)

	pdf.SetXY(110, startY+17.5)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(100, 116, 139)
	pdf.Cell(28, 4.5, "CURRENCY:")
	pdf.SetFont("Arial", "B", 8.5)
	pdf.SetTextColor(16, 185, 129) // Emerald
	pdf.Cell(50, 4.5, "GHc (Ghana Cedi)")

	pdf.SetY(startY + 28)
}

func (s *PDFService) drawBillTable(pdf *gofpdf.Fpdf, records []domain.FiscalRecord, termName string) {
	sectionTitle := "1. SCHOOL FEES & FINANCIAL CHARGES"
	if termName != "" && termName != "N/A" {
		sectionTitle = fmt.Sprintf("1. SCHOOL FEES & FINANCIAL CHARGES (%s)", strings.ToUpper(termName))
	}
	pdf.SetFont("Arial", "B", 9.5)
	pdf.SetTextColor(30, 41, 59)
	pdf.CellFormat(190, 5.5, sectionTitle, "", 1, "L", false, 0, "")
	pdf.Ln(1)

	// Table Header
	pdf.SetFillColor(30, 41, 59) // Slate 800
	pdf.SetDrawColor(30, 41, 59)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 8)
	pdf.CellFormat(12, 6.5, "#", "1", 0, "C", true, 0, "")
	pdf.CellFormat(98, 6.5, "DESCRIPTION / CHARGE CATEGORY", "1", 0, "L", true, 0, "")
	pdf.CellFormat(40, 6.5, "FREQUENCY", "1", 0, "C", true, 0, "")
	pdf.CellFormat(40, 6.5, "AMOUNT (GHc)", "1", 1, "R", true, 0, "")

	type BillItem struct {
		Description string
		Type        string
		Amount      float64
	}
	var items []BillItem
	var totalBill float64 = 0

	breakdownMap := make(map[string]float64)
	for _, record := range records {
		if record.Status != domain.PaymentStatusPaid {
			for _, item := range record.Breakdown {
				breakdownMap[string(item.Category)] += item.Amount
			}
			if len(record.Breakdown) == 0 {
				breakdownMap[string(record.Category)] += record.Amount
			}
		}
	}

	for category, amount := range breakdownMap {
		items = append(items, BillItem{
			Description: category,
			Type:        "TERMLY",
			Amount:      amount,
		})
		totalBill += amount
	}

	if len(items) == 0 {
		items = append(items, BillItem{
			Description: "TUITION & ACADEMIC SERVICES",
			Type:        "TERMLY",
			Amount:      0.00,
		})
	}

	pdf.SetFont("Arial", "", 8)
	pdf.SetDrawColor(226, 232, 240)
	for i, item := range items {
		if i%2 == 0 {
			pdf.SetFillColor(255, 255, 255)
		} else {
			pdf.SetFillColor(248, 250, 252)
		}
		pdf.SetTextColor(30, 41, 59)
		pdf.CellFormat(12, 6, fmt.Sprintf("%d", i+1), "1", 0, "C", true, 0, "")
		pdf.CellFormat(98, 6, "  "+item.Description, "1", 0, "L", true, 0, "")
		pdf.CellFormat(40, 6, item.Type, "1", 0, "C", true, 0, "")
		pdf.CellFormat(40, 6, fmt.Sprintf("%.2f  ", item.Amount), "1", 1, "R", true, 0, "")
	}

	// Total Row
	pdf.SetFont("Arial", "B", 8.5)
	pdf.SetFillColor(241, 245, 249)
	pdf.SetTextColor(15, 23, 42)
	pdf.CellFormat(150, 7, "TOTAL FEES DUE", "1", 0, "R", true, 0, "")
	pdf.SetTextColor(79, 70, 229) // Indigo
	pdf.CellFormat(40, 7, fmt.Sprintf("GHc %.2f  ", totalBill), "1", 1, "R", true, 0, "")
	pdf.Ln(4)
}

func (s *PDFService) drawBillSuppliesTable(pdf *gofpdf.Fpdf, config *domain.BillTemplateConfig) {
	suppliesTitle := "2. REQUIRED BOOKS, STATIONERY & SUPPLIES (ITEMS TO PURCHASE / BRING)"
	if config != nil && config.SuppliesTitle != "" {
		suppliesTitle = config.SuppliesTitle
	}

	pdf.SetFont("Arial", "B", 9.5)
	pdf.SetTextColor(30, 41, 59)
	pdf.CellFormat(190, 5.5, suppliesTitle, "", 1, "L", false, 0, "")
	pdf.Ln(1)

	var items []domain.BillSupplyItem
	if config != nil && len(config.RequiredItems) > 0 {
		items = config.RequiredItems
	} else {
		items = []domain.BillSupplyItem{
			{Category: "BOOKS", Description: "Core Mathematics Course Book", Quantity: "1 copy", Note: "Compulsory for all terms"},
			{Category: "BOOKS", Description: "English Language & Grammar Workbook", Quantity: "1 copy", Note: "Compulsory"},
			{Category: "STATIONERY", Description: "Ruled Exercise Books (Pack of 10)", Quantity: "1 pack", Note: "Available at school store"},
			{Category: "TOILETRIES", Description: "Antiseptic Liquid / Disinfectant (250ml)", Quantity: "2 bottles", Note: "Hand to Housemaster"},
			{Category: "TOILETRIES", Description: "Washing Powder (1kg)", Quantity: "1 pack", Note: "Term requirement"},
			{Category: "TOILETRIES", Description: "Toilet Paper Rolls", Quantity: "3 rolls", Note: "Standard pack"},
		}
	}

	hasPrices := false
	var suppliesTotal float64 = 0
	for _, item := range items {
		if item.Price != nil && *item.Price > 0 {
			hasPrices = true
			suppliesTotal += *item.Price
		}
	}

	// Table Header
	pdf.SetFillColor(51, 65, 85) // Slate 700
	pdf.SetDrawColor(51, 65, 85)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 8)

	if hasPrices {
		// Category (28mm), Description (74mm), Quantity (22mm), Price (28mm), Remarks (38mm) = 190mm
		pdf.CellFormat(28, 6.5, "CATEGORY", "1", 0, "L", true, 0, "")
		pdf.CellFormat(74, 6.5, "ITEM DESCRIPTION & SPECIFICATION", "1", 0, "L", true, 0, "")
		pdf.CellFormat(22, 6.5, "QUANTITY", "1", 0, "C", true, 0, "")
		pdf.CellFormat(28, 6.5, "PRICE (GHc)", "1", 0, "R", true, 0, "")
		pdf.CellFormat(38, 6.5, "REMARKS / SOURCE", "1", 1, "L", true, 0, "")

		pdf.SetFont("Arial", "", 8)
		pdf.SetDrawColor(226, 232, 240)
		for i, item := range items {
			if i%2 == 0 {
				pdf.SetFillColor(255, 255, 255)
			} else {
				pdf.SetFillColor(248, 250, 252)
			}
			pdf.SetTextColor(30, 41, 59)
			priceStr := "-  "
			if item.Price != nil && *item.Price > 0 {
				priceStr = fmt.Sprintf("%.2f  ", *item.Price)
			}
			pdf.CellFormat(28, 5.8, "  "+item.Category, "1", 0, "L", true, 0, "")
			pdf.CellFormat(74, 5.8, "  "+item.Description, "1", 0, "L", true, 0, "")
			pdf.CellFormat(22, 5.8, item.Quantity, "1", 0, "C", true, 0, "")
			pdf.CellFormat(28, 5.8, priceStr, "1", 0, "R", true, 0, "")
			pdf.CellFormat(38, 5.8, "  "+item.Note, "1", 1, "L", true, 0, "")
		}

		// Total Row for supplies if prices exist
		if suppliesTotal > 0 {
			pdf.SetFont("Arial", "B", 8.5)
			pdf.SetFillColor(241, 245, 249)
			pdf.SetTextColor(15, 23, 42)
			pdf.CellFormat(124, 6.5, "ESTIMATED SUPPLIES & BOOKS TOTAL", "1", 0, "R", true, 0, "")
			pdf.SetTextColor(79, 70, 229) // Indigo
			pdf.CellFormat(28, 6.5, fmt.Sprintf("GHc %.2f  ", suppliesTotal), "1", 0, "R", true, 0, "")
			pdf.SetTextColor(100, 116, 139)
			pdf.SetFont("Arial", "I", 7.5)
			pdf.CellFormat(38, 6.5, " Estimated Total", "1", 1, "L", true, 0, "")
		}
	} else {
		// Category (32mm), Description (88mm), Quantity (28mm), Remarks (42mm) = 190mm
		pdf.CellFormat(32, 6.5, "CATEGORY", "1", 0, "L", true, 0, "")
		pdf.CellFormat(88, 6.5, "ITEM DESCRIPTION & SPECIFICATION", "1", 0, "L", true, 0, "")
		pdf.CellFormat(28, 6.5, "QUANTITY", "1", 0, "C", true, 0, "")
		pdf.CellFormat(42, 6.5, "REMARKS / SOURCE", "1", 1, "L", true, 0, "")

		pdf.SetFont("Arial", "", 8)
		pdf.SetDrawColor(226, 232, 240)
		for i, item := range items {
			if i%2 == 0 {
				pdf.SetFillColor(255, 255, 255)
			} else {
				pdf.SetFillColor(248, 250, 252)
			}
			pdf.SetTextColor(30, 41, 59)
			pdf.CellFormat(32, 5.8, "  "+item.Category, "1", 0, "L", true, 0, "")
			pdf.CellFormat(88, 5.8, "  "+item.Description, "1", 0, "L", true, 0, "")
			pdf.CellFormat(28, 5.8, item.Quantity, "1", 0, "C", true, 0, "")
			pdf.CellFormat(42, 5.8, "  "+item.Note, "1", 1, "L", true, 0, "")
		}
	}
	pdf.Ln(3.5)
}

func (s *PDFService) drawBillFooter(pdf *gofpdf.Fpdf, config *domain.BillTemplateConfig) {
	pdf.SetFont("Arial", "B", 9)
	pdf.SetTextColor(30, 41, 59)
	pdf.CellFormat(190, 5, "IMPORTANT NOTICE & PAYMENT INSTRUCTIONS", "", 1, "L", false, 0, "")
	pdf.Ln(0.5)

	footerText := ""
	if config != nil && strings.TrimSpace(config.FooterNotes) != "" {
		footerText = config.FooterNotes
	} else {
		footerText = "Toiletries, stationery, and books must be presented on the first day of resumption.\nAll fee payments must be made using your child's student ID via official school payment channels.\nSTRICTLY NO PHYSICAL CASH PAYMENT TO SCHOOL STAFF.\nPayment can be made in advance to enhance flexible installments."
	}

	lines := strings.Split(footerText, "\n")
	boxHeight := float64(len(lines))*4.2 + 5.0
	if boxHeight < 18 {
		boxHeight = 18
	}

	startY := pdf.GetY()
	pdf.SetFillColor(248, 250, 252) // Slate 50
	pdf.SetDrawColor(203, 213, 225) // Slate 300
	pdf.SetLineWidth(0.3)
	pdf.RoundedRect(10, startY, 190, boxHeight, 2, "1234", "FD")

	// Left accent stripe in indigo
	pdf.SetFillColor(79, 70, 229)
	pdf.Rect(10, startY, 2.5, boxHeight, "F")

	pdf.SetXY(15, startY+2.5)
	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(51, 65, 85)
	pdf.MultiCell(182, 4.2, footerText, "", "L", false)

	pdf.SetY(startY + boxHeight + 5)

	// Signature & Stamp verification section
	signY := pdf.GetY()
	if signY > 265 {
		pdf.AddPage()
		signY = 20
	}

	pdf.SetDrawColor(203, 213, 225)
	pdf.SetLineWidth(0.3)

	pdf.Line(15, signY+12, 85, signY+12)
	pdf.SetXY(15, signY+13)
	pdf.SetFont("Arial", "B", 7.5)
	pdf.SetTextColor(100, 116, 139)
	pdf.Cell(70, 4, "ACCOUNTS & FINANCE DEPARTMENT")

	pdf.Line(120, signY+12, 190, signY+12)
	pdf.SetXY(120, signY+13)
	pdf.Cell(70, 4, "OFFICIAL SCHOOL STAMP / AUTHORIZED SIGNATURE")
}
