package infrastructure

import (
	"context"
	"errors"
	"fmt"
	"log"
	"regexp"
	"time"

	"github.com/user/high-school-management/backend/config"
	"github.com/user/high-school-management/backend/internal/domain"
	"go.uber.org/zap"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

// slowQueryThreshold is the duration above which a SQL query is logged as slow.
const slowQueryThreshold = 300 * time.Millisecond

// zapGormLogger adapts zap.Logger to GORM's logger.Interface.
type zapGormLogger struct {
	zap *zap.Logger
}

func newZapGormLogger(z *zap.Logger) *zapGormLogger {
	return &zapGormLogger{zap: z.WithOptions(zap.AddCallerSkip(3))}
}

func (l *zapGormLogger) LogMode(level gormlogger.LogLevel) gormlogger.Interface { return l }
func (l *zapGormLogger) Info(ctx context.Context, msg string, data ...interface{}) {
	l.zap.Sugar().Infof(msg, data...)
}
func (l *zapGormLogger) Warn(ctx context.Context, msg string, data ...interface{}) {
	l.zap.Sugar().Warnf(msg, data...)
}
func (l *zapGormLogger) Error(ctx context.Context, msg string, data ...interface{}) {
	l.zap.Sugar().Errorf(msg, data...)
}
func (l *zapGormLogger) Trace(ctx context.Context, begin time.Time, fc func() (sql string, rowsAffected int64), err error) {
	elapsed := time.Since(begin)
	sql, rows := fc()
	fields := []zap.Field{
		zap.Duration("elapsed", elapsed),
		zap.Int64("rows", rows),
		zap.String("sql", sql),
	}
	switch {
	case err != nil && !errors.Is(err, gorm.ErrRecordNotFound):
		l.zap.Error("gorm query error", append(fields, zap.Error(err))...)
	case elapsed > slowQueryThreshold:
		l.zap.Warn("slow query detected", fields...)
	}
}

var schemaNameRegex = regexp.MustCompile(`^[a-z_][a-z0-9_]{0,62}$`)

func ValidateSchemaName(name string) error {
	if !schemaNameRegex.MatchString(name) {
		return fmt.Errorf("invalid schema name format")
	}
	return nil
}

// GlobalModels are tables that live in the shared public schema.
// These are platform-wide and not scoped to any tenant.
var GlobalModels = []interface{}{
	&domain.Tenant{},
	&domain.RevokedToken{},
	&domain.PaymentTransaction{},
	&domain.PaymentWebhookLog{},
	&domain.TenantSubscriptionPayment{},
	&domain.ScanEvent{},
	&domain.SystemAnnouncement{},
	&domain.SystemConfig{},
	&domain.SystemSecurityIP{},
	&domain.SystemAuditLog{},
	&domain.Affiliate{},
	&domain.AffiliateReferral{},
	&domain.ContactSubmission{},
	&domain.Newsletter{},
	&domain.NewsletterSubscriber{},
	&domain.SupportTicket{},
	&domain.PlatformInvoice{},
	&domain.TelemetryEvent{},
	&domain.HardwareLease{},
	&domain.WhitelistedIP{},
	&domain.SmsLedger{},
	&domain.SenderIDRequest{},
	&domain.SMSTopUpPayment{},
}

// TenantModels are tables created inside each tenant's own schema.
var TenantModels = []interface{}{
	// Core identity & staff
	&domain.User{},
	&domain.StaffProfile{},
	&domain.Teacher{},
	&domain.Department{},
	// Students
	&domain.Student{},
	&domain.Guardian{},
	&domain.TemporaryPickupOTP{},
	&domain.AbsenceRequest{},
	&domain.AlumniProfile{},
	&domain.StudentPortfolio{},
	&domain.PortfolioAchievement{},
	// Academic structure
	&domain.ScholasticLevel{},
	&domain.AcademicPeriod{},
	&domain.AcademicTerm{},
	&domain.Class{},
	&domain.Subject{},
	&domain.TeacherClassAssignment{},
	&domain.TimetableEntry{},
	// Attendance
	&domain.Attendance{},
	&domain.StaffAttendance{},
	&domain.ScanEvent{},
	&domain.BiometricDevice{},
	// Grades & assessments
	&domain.Grade{},
	&domain.GradeWeight{},
	&domain.GradeLog{},
	&domain.ClassTermLock{},
	&domain.AcademicInsight{},
	&domain.AcademicAssignment{},
	&domain.Homework{},
	&domain.HomeworkSubmission{},
	// Exams & CBT
	&domain.Exam{},
	&domain.ExamSchedule{},
	&domain.ExamResult{},
	&domain.ExamSession{},
	&domain.InvigilationDuty{},
	&domain.CBTQuiz{},
	&domain.CBTQuestion{},
	&domain.CBTQuestionBank{},
	&domain.CBTAttempt{},
	&domain.CBTAnswer{},
	// Report cards & terminal
	&domain.ReportCard{},
	&domain.ReportCardTemplate{},
	&domain.TerminalEvaluation{},
	&domain.YearEndResult{},
	&domain.CompetencyRubric{},
	&domain.CompetencyEvaluation{},
	&domain.IEPPlan{},
	&domain.IEPMilestone{},
	// Health & welfare
	&domain.HealthRecord{},
	&domain.SickbayVisit{},
	&domain.BehaviorLog{},
	&domain.DisciplinaryIncident{},
	&domain.InterventionPlan{},
	// HR & payroll
	&domain.PerformanceReview{},
	&domain.ProfessionalDevelopment{},
	&domain.PayrollRecord{},
	&domain.DeductionType{},
	&domain.AllowanceType{},
	&domain.TaxBracket{},
	&domain.LeaveRequest{},
	&domain.LeaveBalance{},
	&domain.OnboardingChecklist{},
	&domain.Document{},
	// Finance
	&domain.FiscalRecord{},
	&domain.FeeStructure{},
	&domain.WalletTransaction{},
	&domain.DailyBill{},
	&domain.Budget{},
	&domain.Expenditure{},
	&domain.ExpenseClaim{},
	&domain.Donation{},
	&domain.Scholarship{},
	&domain.InstallmentAgreement{},
	&domain.InstallmentMilestone{},
	&domain.InstallmentPlanTemplate{},
	&domain.BillTemplateConfig{},
	// Inventory & procurement
	&domain.InventoryItem{},
	&domain.AssetCheckout{},
	&domain.StockItem{},
	&domain.StockMovement{},
	&domain.Supplier{},
	&domain.PurchaseOrder{},
	&domain.POLineItem{},
	// Library
	&domain.LibraryBook{},
	&domain.LibraryLoan{},
	// Transport
	&domain.TransportRoute{},
	&domain.RouteStop{},
	&domain.BusAssignment{},
	&domain.BusLocation{},
	// Catering
	&domain.MealPlan{},
	&domain.CanteenSubscription{},
	// Facilities & rooms
	&domain.Resource{},
	&domain.Room{},
	&domain.Booking{},
	&domain.RoomBooking{},
	&domain.FacilityUsageLog{},
	// Events & communication
	&domain.Campaign{},
	&domain.CampaignLog{},
	&domain.Event{},
	&domain.Notice{},
	&domain.Reminder{},
	&domain.Notification{},
	&domain.Conversation{},
	&domain.Message{},
	&domain.WhatsAppMessage{},
	&domain.SubjectRecommendation{},
	&domain.MeetingSlot{},
	&domain.MeetingBooking{},
	&domain.EmergencyBroadcast{},
	// Clubs & houses
	&domain.Club{},
	&domain.ClubMember{},
	&domain.House{},
	&domain.HouseMember{},
	&domain.HousePointEntry{},
	// Boarding & Hostels
	&domain.Hostel{},
	&domain.HostelRoom{},
	&domain.BedAllocation{},
	// Teacher Portal Suite
	&domain.SeatingChart{},
	&domain.LessonPlan{},
	&domain.GradingRubric{},
	&domain.RubricCriterion{},
	&domain.SickbayReferral{},
	&domain.TeacherResource{},
	&domain.TeacherCoverRequest{},
	// Visitors & security
	&domain.VisitorLog{},
	&domain.ScanEvent{},
	// Audit
	&domain.AuditLog{},
}

var globalDatabaseURL string

func ConnectDB(cfg *config.Config) *gorm.DB {
	globalDatabaseURL = cfg.DatabaseURL

	// Build a production-grade zap logger for GORM slow-query tracing.
	zapLogger, _ := zap.NewProduction()

	gormCfg := &gorm.Config{
		Logger: newZapGormLogger(zapLogger),
	}

	db, err := gorm.Open(postgres.Open(cfg.DatabaseURL), gormCfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	registerTenantCallbacks(db)

	// Configure connection pool to prevent exhaustion under load (Gap #45)
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Failed to get underlying sql.DB: %v", err)
	}
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	if cfg.AutoMigrate {
		log.Println("INFO: AUTO_MIGRATE flag is set (note: GORM AutoMigrate now runs unconditionally on startup).")
	}

	log.Println("Database connected successfully")
	return db
}

func MigrateTenantSchema(db *gorm.DB, schemaName string) error {
	if err := ValidateSchemaName(schemaName); err != nil {
		return err
	}

	// Create current schema if it doesn't exist
	if err := db.Exec("CREATE SCHEMA IF NOT EXISTS " + schemaName).Error; err != nil {
		return err
	}

	return RunTenantMigrations(db, schemaName)
}
