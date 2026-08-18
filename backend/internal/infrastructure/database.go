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

var TenantModels = []interface{}{
	&domain.User{},
	&domain.Student{},
	&domain.Teacher{},
	&domain.Department{},
	&domain.Class{},
	&domain.Subject{},
	&domain.Grade{},
	&domain.Attendance{},
	&domain.Campaign{},
	&domain.CampaignLog{},
	&domain.Conversation{},
	&domain.Message{},
	&domain.TeacherClassAssignment{},
	&domain.GradeWeight{},
	&domain.GradeLog{},
	&domain.ClassTermLock{},
	&domain.AcademicInsight{},
	&domain.LibraryBook{},
	&domain.LibraryLoan{},
	&domain.Resource{},
	&domain.Booking{},
	&domain.AlumniProfile{},
	&domain.Guardian{},
	&domain.FiscalRecord{},
	&domain.Club{},
	&domain.ClubMember{},
	&domain.Event{},
	&domain.TimetableEntry{},
	&domain.AcademicAssignment{},
	&domain.AuditLog{},
	&domain.AcademicPeriod{},
	&domain.AcademicTerm{},
	&domain.ScholasticLevel{},
	&domain.Homework{},
	&domain.HealthRecord{},
	&domain.BehaviorLog{},
	&domain.PerformanceReview{},
	&domain.ProfessionalDevelopment{},
	&domain.ExamSession{},
	&domain.InvigilationDuty{},
	&domain.DeductionType{},
	&domain.AllowanceType{},
	&domain.TaxBracket{},
	&domain.TransportRoute{},
	&domain.BusAssignment{},
	&domain.MealPlan{},
	&domain.CanteenSubscription{},
	&domain.InventoryItem{},
	&domain.VisitorLog{},
	&domain.FeeStructure{},
	&domain.WalletTransaction{},
	&domain.ScanEvent{},
	&domain.StaffProfile{},
	&domain.PayrollRecord{},
	&domain.LeaveRequest{},
	&domain.LeaveBalance{},
	&domain.StaffAttendance{},
	&domain.PerformanceReview{},
	&domain.ProfessionalDevelopment{},
	&domain.OnboardingChecklist{},
	&domain.Document{},
	&domain.Donation{},
	&domain.Exam{},
	&domain.ExamSchedule{},
	&domain.ExamResult{},
	&domain.StudentPortfolio{},
	&domain.PortfolioAchievement{},
	&domain.Notice{},
	&domain.Reminder{},
	&domain.MeetingSlot{},
	&domain.MeetingBooking{},
	&domain.Budget{},
	&domain.Expenditure{},
	&domain.ExpenseClaim{},
	&domain.RoomBooking{},
	&domain.FacilityUsageLog{},
	&domain.DailyBill{},
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
		log.Println("WARNING: AUTO_MIGRATE is set to true but has been deprecated. Use 'go run ./cmd/migrate up' instead.")
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

	sqlDB, err := db.DB()
	if err != nil {
		return err
	}

	return runMigrationsForSchema(sqlDB, schemaName, globalDatabaseURL)
}
