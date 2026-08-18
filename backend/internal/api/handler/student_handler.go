package handler

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/pkg/encryption"
	"github.com/xuri/excelize/v2"
)

// studentExportHeaders defines the column order for CSV/Excel exports.
var studentExportHeaders = []string{
	"first_name", "last_name", "other_name",
	"gender", "dob", "phone_number",
	"placed_residence_type",
	"enrollment_num", "status", "level", "academic_year",
}

type StudentHandler struct {
	studentUseCase domain.StudentUseCase
}

func NewStudentHandler(r *gin.RouterGroup, uc domain.StudentUseCase) {
	handler := &StudentHandler{
		studentUseCase: uc,
	}

	api := r.Group("/students")
	{
		api.POST("", middleware.RoleMiddleware(domain.RoleAdmin), handler.Create)
		api.GET("/:id", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleTeacher), handler.GetByID)
		api.GET("/:id/timeline", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleTeacher), handler.GetTimeline)
		api.GET("", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleTeacher), handler.GetAll)
		api.PUT("/:id", middleware.RoleMiddleware(domain.RoleAdmin), handler.Update)
		api.DELETE("/:id", middleware.RoleMiddleware(domain.RoleAdmin), handler.Delete)
		api.DELETE("", middleware.RoleMiddleware(domain.RoleAdmin), handler.BulkDelete)
		api.POST("/bulk-delete", middleware.RoleMiddleware(domain.RoleAdmin), handler.BulkDeletePost)
		api.POST("/enroll", middleware.RoleMiddleware(domain.RoleAdmin), handler.Enroll)
		api.GET("/class/:class_id", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleTeacher), handler.GetByClass)
		// Import / Export
		api.GET("/export/csv", middleware.RoleMiddleware(domain.RoleAdmin), handler.ExportCSV)
		api.GET("/export/excel", middleware.RoleMiddleware(domain.RoleAdmin), handler.ExportExcel)
		api.GET("/import/template", middleware.RoleMiddleware(domain.RoleAdmin), handler.GetImportTemplate)
		api.POST("/import", middleware.RoleMiddleware(domain.RoleAdmin), handler.Import)
		api.POST("/promote", middleware.RoleMiddleware(domain.RoleAdmin), handler.Promote)
	}
}

func (h *StudentHandler) Create(c *gin.Context) {
	var student domain.Student
	if err := c.ShouldBindJSON(&student); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Auto-generate UUID if not provided
	if student.ID == uuid.Nil {
		student.ID = uuid.New()
	}

	// CampusID injection removed as part of transition to single-campus global data model.

	err := h.studentUseCase.CreateStudent(c.Request.Context(), &student)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, student)
}

func (h *StudentHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID format"})
		return
	}

	student, err := h.studentUseCase.GetStudentByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	c.JSON(http.StatusOK, student)
}

func (h *StudentHandler) GetTimeline(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID format"})
		return
	}

	timeline, err := h.studentUseCase.GetStudentTimeline(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch timeline"})
		return
	}

	c.JSON(http.StatusOK, timeline)
}

func (h *StudentHandler) GetAll(c *gin.Context) {
	query := domain.ParsePagination(c)
	totalCount, students, err := h.studentUseCase.GetAllStudentsPaginated(c.Request.Context(), query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := domain.NewPaginatedResponse(students, totalCount, query)
	c.JSON(http.StatusOK, response)
}

func (h *StudentHandler) Update(c *gin.Context) {
	var student domain.Student
	if err := c.ShouldBindJSON(&student); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID format"})
		return
	}
	student.ID = id

	err = h.studentUseCase.UpdateStudent(c.Request.Context(), &student)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, student)
}

func (h *StudentHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID format"})
		return
	}

	err = h.studentUseCase.DeleteStudent(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Student deleted successfully"})
}

// BulkDelete accepts a raw JSON array of UUIDs in the request body (used by DELETE /students)
// This matches the frontend: this.http.request('delete', this.apiUrl, { body: ids })
func (h *StudentHandler) BulkDelete(c *gin.Context) {
	var ids []uuid.UUID
	if err := c.ShouldBindJSON(&ids); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Expected a JSON array of UUIDs"})
		return
	}

	var failures []string
	for _, id := range ids {
		if err := h.studentUseCase.DeleteStudent(c.Request.Context(), id); err != nil {
			failures = append(failures, id.String())
		}
	}

	if len(failures) > 0 {
		c.JSON(http.StatusMultiStatus, gin.H{
			"message":  "Some students could not be deleted",
			"failures": failures,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Students deleted successfully"})
}

// BulkDeletePost accepts {\"ids\": [...]} — kept for backward compatibility
func (h *StudentHandler) BulkDeletePost(c *gin.Context) {
	var input struct {
		IDs []uuid.UUID `json:"ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var failures []string
	for _, id := range input.IDs {
		if err := h.studentUseCase.DeleteStudent(c.Request.Context(), id); err != nil {
			failures = append(failures, id.String())
		}
	}

	if len(failures) > 0 {
		c.JSON(http.StatusMultiStatus, gin.H{
			"message":  "Some students could not be deleted",
			"failures": failures,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Students deleted successfully"})
}

func (h *StudentHandler) Enroll(c *gin.Context) {
	var input struct {
		IDs     []uuid.UUID `json:"ids" binding:"required"`
		ClassID uuid.UUID   `json:"class_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.studentUseCase.EnrollStudents(c.Request.Context(), input.IDs, input.ClassID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Students enrolled successfully"})
}

func (h *StudentHandler) GetByClass(c *gin.Context) {
	id, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class ID format"})
		return
	}
	students, err := h.studentUseCase.GetStudentsByClass(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, students)
}

// --- Export / Import ---

func studentToRow(s domain.Student) []string {
	return []string{

		string(s.FirstName),
		string(s.LastName),
		string(s.OtherName),
		s.Gender,
		string(s.DOB),
		string(s.PhoneNumber),
		s.PlacedResidenceType,
		s.EnrollmentNum,
		string(s.Status),
		strconv.Itoa(s.Level),
		s.AcademicYear,
	}
}

// ExportCSV streams all students as a CSV file download.
func (h *StudentHandler) ExportCSV(c *gin.Context) {
	students, err := h.studentUseCase.GetAllStudents(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	buf := &bytes.Buffer{}
	w := csv.NewWriter(buf)
	_ = w.Write(studentExportHeaders)
	for _, s := range students {
		_ = w.Write(studentToRow(s))
	}
	w.Flush()

	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=students.csv")
	c.Data(http.StatusOK, "text/csv", buf.Bytes())
}

// ExportExcel streams all students as an Excel (.xlsx) file download.
func (h *StudentHandler) ExportExcel(c *gin.Context) {
	students, err := h.studentUseCase.GetAllStudents(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	f := excelize.NewFile()
	defer f.Close()
	sheet := "Students"
	f.SetSheetName("Sheet1", sheet)

	// Header row with bold style
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "FFFFFF"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"4F46E5"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})

	for col, hdr := range studentExportHeaders {
		cell, _ := excelize.CoordinatesToCellName(col+1, 1)
		f.SetCellValue(sheet, cell, hdr)
		f.SetCellStyle(sheet, cell, cell, headerStyle)
		colLetter, _ := excelize.ColumnNumberToName(col + 1)
		f.SetColWidth(sheet, colLetter, colLetter, 18)
	}

	// Data rows
	for rowIdx, s := range students {
		row := studentToRow(s)
		for col, val := range row {
			cell, _ := excelize.CoordinatesToCellName(col+1, rowIdx+2)
			f.SetCellValue(sheet, cell, val)
		}
	}

	buf, err := f.WriteToBuffer()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate Excel file"})
		return
	}

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename=students.xlsx")
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf.Bytes())
}

// GetImportTemplate returns a template file (CSV or Excel) with sample data to guide users on import formats.
func (h *StudentHandler) GetImportTemplate(c *gin.Context) {
	format := c.Query("format")
	if format == "" {
		format = "csv"
	}

	// Use export headers but optionally filter if needed. For now, matching export is best for consistency.
	// We'll provide 3 rows of high-quality sample data.
	// Sample rows aligned to studentExportHeaders (13 columns): index_number, first_name, last_name, other_name, gender, dob, phone_number, email, placed_residence_type, enrollment_num, status, level, academic_year
	sampleRows := [][]string{
		{"001010101", "John", "Doe", "Kwame", "Male", "2005-05-14", "0541234567", "john.doe@example.com", "Boarding", "ENR001", "ACTIVE", "1", "2023/2024"},
		{"001010102", "Jane", "Smith", "Ama", "Female", "2006-02-20", "0209876543", "jane.smith@example.com", "Day", "ENR002", "ACTIVE", "1", "2023/2024"},
		{"001010103", "Peter", "Osei", "", "Male", "2005-11-05", "0245678901", "peter.o@example.com", "Boarding", "ENR003", "ACTIVE", "2", "2023/2024"},
	}

	if format == "csv" {
		buf := &bytes.Buffer{}
		w := csv.NewWriter(buf)
		_ = w.Write(studentExportHeaders)
		for _, row := range sampleRows {
			_ = w.Write(row)
		}
		w.Flush()

		c.Header("Content-Type", "text/csv")
		c.Header("Content-Disposition", "attachment; filename=students_import_template.csv")
		c.Data(http.StatusOK, "text/csv", buf.Bytes())
		return
	}

	if format == "excel" {
		f := excelize.NewFile()
		defer f.Close()
		sheet := "Students Template"
		f.SetSheetName("Sheet1", sheet)

		// Header row with bold style
		headerStyle, _ := f.NewStyle(&excelize.Style{
			Font:      &excelize.Font{Bold: true, Color: "FFFFFF"},
			Fill:      excelize.Fill{Type: "pattern", Color: []string{"4F46E5"}, Pattern: 1},
			Alignment: &excelize.Alignment{Horizontal: "center"},
		})

		for col, hdr := range studentExportHeaders {
			cell, _ := excelize.CoordinatesToCellName(col+1, 1)
			f.SetCellValue(sheet, cell, hdr)
			f.SetCellStyle(sheet, cell, cell, headerStyle)
			colLetter, _ := excelize.ColumnNumberToName(col + 1)
			f.SetColWidth(sheet, colLetter, colLetter, 18)
		}

		// Data rows
		for rowIdx, row := range sampleRows {
			for col, val := range row {
				cell, _ := excelize.CoordinatesToCellName(col+1, rowIdx+2)
				f.SetCellValue(sheet, cell, val)
			}
		}

		buf, err := f.WriteToBuffer()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate Excel file"})
			return
		}

		c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
		c.Header("Content-Disposition", "attachment; filename=students_import_template.xlsx")
		c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf.Bytes())
		return
	}

	c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid format requested. Use 'csv' or 'excel'."})
}

// Import accepts a multipart CSV or XLSX file and bulk-upserts students.
// Optimizations:
//  1. Streaming CSV parse — rows read one at a time, no full-file load into memory.
//  2. Worker pool pre-validation — rows are validated concurrently (10 workers).
//  3. All errors collected BEFORE any DB write (dry-run pass).
//  4. Batch upsert — valid rows sent to DB in single batched statement (500/batch).
func (h *StudentHandler) Import(c *gin.Context) {
	const batchSize = 500
	const numWorkers = 10

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded. Use multipart field 'file'."})
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))

	// --- Phase 0: Parse rows (streaming for CSV, chunked for Excel) ---
	var dataRows [][]string
	var headerRow []string

	switch ext {
	case ".csv":
		headerRow, dataRows, err = streamCSVRows(file)
	case ".xlsx":
		headerRow, dataRows, err = readExcelRows(file)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported file type. Upload a .csv or .xlsx file."})
		return
	}
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Failed to parse file: %v", err)})
		return
	}
	if len(dataRows) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File has no data rows."})
		return
	}

	// Build header → column index map
	headerMap := make(map[string]int, len(headerRow))
	for i, h := range headerRow {
		headerMap[strings.TrimSpace(strings.ToLower(h))] = i
	}
	getField := func(row []string, key string) string {
		if idx, ok := headerMap[key]; ok && idx < len(row) {
			return strings.TrimSpace(row[idx])
		}
		return ""
	}

	// --- Phase 1: Pre-validation via worker pool ---
	type rowResult struct {
		rowNum  int
		student *domain.Student
		errMsg  string
	}

	resultsCh := make(chan rowResult, len(dataRows))
	jobsCh := make(chan struct {
		index int
		row   []string
	}, len(dataRows))

	var wg sync.WaitGroup
	for w := 0; w < numWorkers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for job := range jobsCh {
				rowNum := job.index + 2 // 1-indexed + header offset
				row := job.row
				firstName := getField(row, "first_name")
				lastName := getField(row, "last_name")
				if firstName == "" || lastName == "" {
					resultsCh <- rowResult{rowNum: rowNum, errMsg: fmt.Sprintf("Row %d: first_name and last_name are required", rowNum)}
					continue
				}

				level, _ := strconv.Atoi(getField(row, "level"))
				if level == 0 {
					level = 1 // Default to Level 1 as requested
				}

				s := domain.Student{
					ID:                  uuid.New(),
					FirstName:           encryption.EncryptedString(firstName),
					LastName:            encryption.EncryptedString(lastName),
					OtherName:           encryption.EncryptedString(getField(row, "other_name")),
					Gender:              getField(row, "gender"),
					DOB:                 encryption.EncryptedString(getField(row, "dob")),
					PhoneNumber:         encryption.EncryptedString(getField(row, "phone_number")),
					PlacedResidenceType: getField(row, "placed_residence_type"),
					EnrollmentNum:       getField(row, "enrollment_num"),
					Status:              domain.StatusActive,
					Level:               level,
					AcademicYear:        getField(row, "academic_year"),
				}
				resultsCh <- rowResult{rowNum: rowNum, student: &s}
			}
		}()
	}

	for i, row := range dataRows {
		jobsCh <- struct {
			index int
			row   []string
		}{i, row}
	}
	close(jobsCh)
	wg.Wait()
	close(resultsCh)

	// Collect results preserving row order
	resultMap := make(map[int]rowResult, len(dataRows))
	for res := range resultsCh {
		resultMap[res.rowNum] = res
	}

	var validStudents []domain.Student
	var validationErrors []string
	for i := range dataRows {
		res := resultMap[i+2]
		if res.errMsg != "" {
			validationErrors = append(validationErrors, res.errMsg)
		} else if res.student != nil {
			validStudents = append(validStudents, *res.student)
		}
	}

	// If all rows have validation errors, abort before touching the DB
	if len(validStudents) == 0 {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"imported": 0,
			"failed":   len(validationErrors),
			"errors":   validationErrors,
		})
		return
	}

	// --- Phase 2: Batch upsert (ON CONFLICT index_number → UPDATE) ---
	var dbErrors []string
	if err := h.studentUseCase.BulkUpsertStudents(c.Request.Context(), validStudents, batchSize); err != nil {
		dbErrors = append(dbErrors, fmt.Sprintf("Batch write error: %v", err))
	}

	imported := len(validStudents)
	if len(dbErrors) > 0 {
		imported = 0
	}

	c.JSON(http.StatusOK, gin.H{
		"imported": imported,
		"failed":   len(validationErrors) + len(dbErrors),
		"errors":   append(validationErrors, dbErrors...),
	})
}

func (h *StudentHandler) Promote(c *gin.Context) {
	var req struct {
		StudentIDs       []uuid.UUID `json:"student_ids" binding:"required"`
		NextAcademicYear string      `json:"next_academic_year" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.studentUseCase.PromoteStudents(c.Request.Context(), req.StudentIDs, req.NextAcademicYear)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Promotion successful"})
}

// streamCSVRows reads CSV header and data rows using a streaming reader.
func streamCSVRows(r io.Reader) (header []string, rows [][]string, err error) {
	reader := csv.NewReader(r)
	reader.LazyQuotes = true
	reader.ReuseRecord = false // safe for concurrent processing

	header, err = reader.Read()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read header: %w", err)
	}
	for {
		record, readErr := reader.Read()
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			continue // skip malformed rows
		}
		rows = append(rows, record)
	}
	return header, rows, nil
}

// readExcelRows reads all rows from the first sheet of an xlsx file.
func readExcelRows(r io.Reader) (header []string, rows [][]string, err error) {
	data, err := io.ReadAll(r)
	if err != nil {
		return nil, nil, err
	}
	f, err := excelize.OpenReader(bytes.NewReader(data))
	if err != nil {
		return nil, nil, err
	}
	defer f.Close()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, nil, fmt.Errorf("no sheets found")
	}
	allRows, err := f.GetRows(sheets[0])
	if err != nil || len(allRows) == 0 {
		return nil, nil, fmt.Errorf("empty sheet")
	}
	return allRows[0], allRows[1:], nil
}
