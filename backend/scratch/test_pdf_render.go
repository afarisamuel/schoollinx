package main

import (
	"bytes"
	"fmt"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/pdf"
	"github.com/user/high-school-management/backend/pkg/encryption"
)

func main() {
	pdfService := pdf.NewPDFService()

	studentID := uuid.New()
	student := &domain.Student{
		ID:            studentID,
		EnrollmentNum: "STU-2026-0042",
		FirstName:     encryption.EncryptedString("Kofi"),
		LastName:      encryption.EncryptedString("Mensah"),
		AcademicYear:  "2026 / 2027",
		Level:         5,
		PhotoURL:      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
	}

	tenant := &domain.Tenant{
		ID:                     uuid.New(),
		Name:                   "ST. AGNES ACADEMY & LEADERSHIP INSTITUTE",
		Motto:                  "Knowledge, Integrity, and Excellence",
		Address:                "P.O. Box 452, Cantonments, Accra, Ghana",
		ContactNumbers:         "+233 24 000 1122 / +233 30 222 3344",
		Email:                  "admissions@stagnes.edu.gh",
		LogoURL:                "https://cdn-icons-png.flaticon.com/512/2997/2997295.png",
		HeadmasterSignatureURL: "",
		ClassScoreWeight:       0.4,
		ExamScoreWeight:        0.6,
	}

	classTeacher := &domain.Teacher{
		ID:           uuid.New(),
		FirstName:    encryption.EncryptedString("Grace"),
		LastName:     encryption.EncryptedString("Appiah"),
		SignatureURL: "",
	}

	grades := []domain.Grade{
		{Subject: "Mathematics", Category: domain.CategoryAssignment, Value: 88},
		{Subject: "Mathematics", Category: domain.CategoryFinal, Value: 92},
		{Subject: "English Language", Category: domain.CategoryAssignment, Value: 78},
		{Subject: "English Language", Category: domain.CategoryFinal, Value: 84},
		{Subject: "Integrated Science", Category: domain.CategoryAssignment, Value: 95},
		{Subject: "Integrated Science", Category: domain.CategoryFinal, Value: 90},
		{Subject: "Social Studies", Category: domain.CategoryAssignment, Value: 72},
		{Subject: "Social Studies", Category: domain.CategoryFinal, Value: 76},
		{Subject: "ICT & Computing", Category: domain.CategoryAssignment, Value: 98},
		{Subject: "ICT & Computing", Category: domain.CategoryFinal, Value: 96},
		{Subject: "French", Category: domain.CategoryAssignment, Value: 68},
		{Subject: "French", Category: domain.CategoryFinal, Value: 74},
	}

	eval := &domain.TerminalEvaluation{
		Conduct:            "Exemplary & highly respectful",
		Attitude:           "Dedicated, enthusiastic, and curious",
		Interest:           "Robotics club, Debate society & Football",
		ClassTeacherRemark: "Kofi has demonstrated remarkable academic brilliance and disciplined leadership.",
		HeadTeacherRemark:  "An outstanding performance. Commended for exemplary diligence and character.",
	}

	attendance := map[string]int{
		"present": 58,
		"absent":  2,
		"tardy":   0,
	}

	subjectPositions := map[string]string{
		"Mathematics":        "1st",
		"English Language":   "3rd",
		"Integrated Science": "1st",
		"Social Studies":     "4th",
		"ICT & Computing":    "1st",
		"French":             "2nd",
	}

	reportData := pdf.TerminalReportData{
		Student:          student,
		Tenant:           tenant,
		ClassTeacher:     classTeacher,
		Grades:           grades,
		Evaluation:       eval,
		Attendance:       attendance,
		Term:             "Term 1",
		AcademicYear:     "2026/2027",
		ClassSize:        32,
		PositionInClass:  "1st of 32",
		SubjectPositions: subjectPositions,
		NextTermBegins:   "15 Jan 2027",
		PromotedTo:       "Level 6",
	}

	// 1. Generate Terminal Report PDF
	var reportBuf bytes.Buffer
	err := pdfService.GenerateTerminalReport(&reportBuf, reportData)
	if err != nil {
		fmt.Printf("ERROR generating report: %v\n", err)
		os.Exit(1)
	}
	_ = os.WriteFile("scratch/test_report_card.pdf", reportBuf.Bytes(), 0644)
	fmt.Printf("SUCCESS: Terminal Report PDF generated (%d bytes)\n", reportBuf.Len())

	// 2. Generate Pupil Bill PDF
	records := []domain.FiscalRecord{
		{
			Category: domain.CategoryTuition,
			Amount:   1200.0,
			Status:   domain.PaymentStatusPending,
		},
		{
			Category: domain.CategoryLab,
			Amount:   150.0,
			Status:   domain.PaymentStatusPending,
		},
		{
			Category: domain.CategoryExtracurricular,
			Amount:   80.0,
			Status:   domain.PaymentStatusPending,
		},
	}

	config := &domain.BillTemplateConfig{
		Title:             "Pupil Termly Bill",
		ShowSuppliesTable: true,
		SuppliesTitle:     "2. MANDATORY STATIONERY & LEARNING MATERIALS",
		FooterNotes:       "All payments must be remitted via the school portal or assigned accounts before resumption.\nStrictly no cash payments permitted on campus.",
	}

	var billBuf bytes.Buffer
	err = pdfService.GeneratePupilBill(&billBuf, tenant.Name, tenant, student, records, config, "Term 1", "2026/2027")
	if err != nil {
		fmt.Printf("ERROR generating bill: %v\n", err)
		os.Exit(1)
	}
	_ = os.WriteFile("scratch/test_pupil_bill.pdf", billBuf.Bytes(), 0644)
	fmt.Printf("SUCCESS: Pupil Bill PDF generated (%d bytes)\n", billBuf.Len())
	_ = time.Second
}
