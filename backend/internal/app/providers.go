package app

import (
	"github.com/user/high-school-management/backend/config"
	"github.com/user/high-school-management/backend/internal/api/ws"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/mailer"
	"github.com/user/high-school-management/backend/internal/infrastructure/payment"
	"github.com/user/high-school-management/backend/internal/infrastructure/pdf"
	"github.com/user/high-school-management/backend/internal/infrastructure/repository"
	"github.com/user/high-school-management/backend/internal/infrastructure/sms"
	"github.com/user/high-school-management/backend/internal/usecase"
	"gorm.io/gorm"
)

type Infrastructure struct {
	SMTP     mailer.MailService
	PDF      *pdf.PDFService
	Paystack domain.PaystackService
	Hub      *ws.Hub
	SMS      domain.SMSProvider
}

type Repositories struct {
	Tenant         domain.TenantRepository
	User           domain.UserRepository
	Audit          domain.AuditRepository
	Department     domain.DepartmentRepository
	Student        domain.StudentRepository
	Guardian       domain.GuardianRepository
	Teacher        domain.TeacherRepository
	Class          domain.ClassRepository
	Assignment     domain.AssignmentRepository
	Grade          domain.GradeRepository
	Attendance     domain.AttendanceRepository
	Subject        domain.SubjectRepository
	Timetable      domain.TimetableRepository
	Recommendation domain.RecommendationRepository
	Campaign       domain.CampaignRepository
	Message        domain.MessageRepository
	Resource       domain.ResourceRepository
	Fiscal         domain.FiscalRepository
	Library        domain.LibraryRepository
	Extra          domain.ExtracurricularRepository
	Intelligence   domain.IntelligenceRepository
	AcademicPeriod domain.AcademicPeriodRepository
	Scholastic     domain.ScholasticLevelRepository
	Welfare        domain.WelfareRepository
	Logistics      domain.LogisticsRepository
	Facility       domain.FacilityRepository
	Homework       domain.HomeworkRepository
	Payment        domain.PaymentRepository
	Intervention   domain.InterventionRepository
	Document       domain.DocumentRepository
	Donation       domain.DonationRepository
	Blacklist      domain.TokenBlacklistRepository
	HR             domain.HRRepository
	Exam           domain.ExamRepository
	Portfolio      domain.PortfolioRepository
	Communication  domain.CommunicationRepository
	TerminalEvaluation domain.TerminalEvaluationRepository
	DailyBill      domain.DailyBillRepository
	House          domain.HouseRepository
	Newsletter     domain.NewsletterRepository
	Ledger         domain.LedgerRepository
	CBT            domain.CBTRepository
	ReportCard     domain.ReportCardRepository
	Stock          domain.StockRepository
	Procurement    domain.ProcurementRepository
	Tracking       domain.TrackingRepository
	CampusOps      domain.CampusOpsRepository
}

type UseCases struct {
	Audit          domain.AuditUseCase
	Tenant         usecase.TenantUseCase
	Department     domain.DepartmentUseCase
	Student        domain.StudentUseCase
	Academic       domain.AcademicUseCase
	Guardian       domain.GuardianUseCase
	Teacher        domain.TeacherUseCase
	Class          domain.ClassUseCase
	Assignment     domain.AssignmentUseCase
	Grade          domain.GradeUseCase
	Subject        *usecase.SubjectUseCase
	Timetable      *usecase.TimetableUseCase
	Analytics      *usecase.AnalyticsUseCase
	Homework       domain.HomeworkUseCase
	Search         domain.SearchUseCase
	Recommendation domain.RecommendationEngine
	Campaign       usecase.CampaignManager
	Intelligence   domain.IntelligenceUseCase
	Message        domain.MessageUseCase
	Attendance     domain.AttendanceUseCase
	Resource       domain.ResourceUseCase
	Fiscal         domain.FiscalUseCase
	Library        domain.LibraryUseCase
	Extra          domain.ExtracurricularUseCase
	AcademicPeriod domain.AcademicPeriodUseCase
	Scholastic     domain.ScholasticLevelUseCase
	Welfare        domain.WelfareUseCase
	Logistics      domain.LogisticsUseCase
	Facility       domain.FacilityUseCase
	Payment        usecase.PaymentUseCase
	Document       domain.DocumentUseCase
	TeacherPortal  domain.TeacherPortalUseCase
	HR             domain.HRUseCase
	Exam           domain.ExamUseCase
	Portfolio      domain.PortfolioUseCase
	Communication  domain.CommunicationUseCase
	DailyBill      domain.DailyBillUseCase
	House          domain.HouseUseCase
	Newsletter     domain.NewsletterUseCase
	Ledger         *usecase.LedgerUseCase
	CBT            *usecase.CBTUseCase
	ReportCard     *usecase.ReportCardUseCase
	Stock          *usecase.StockUseCase
	Procurement    *usecase.ProcurementUseCase
	Tracking       *usecase.TrackingUseCase
	Notification   domain.NotificationUseCase
	CampusOps      domain.CampusOpsUseCase
}

func initInfrastructure(cfg *config.Config) *Infrastructure {
	hub := ws.NewHub(cfg.RedisURL)
	go hub.Run()

	return &Infrastructure{
		SMTP:     mailer.NewSMTPService(cfg),
		PDF:      pdf.NewPDFService(),
		Paystack: payment.NewPaystackService(cfg),
		Hub:      hub,
		SMS:      sms.NewArkaselSMSProvider(cfg.SMSAPIKey),
	}
}

func initRepositories(db *gorm.DB) *Repositories {
	return &Repositories{
		Tenant:         repository.NewTenantRepository(db),
		User:           repository.NewUserRepository(db),
		Audit:          repository.NewAuditRepository(db),
		Department:     repository.NewDepartmentRepository(db),
		Student:        repository.NewStudentRepository(db),
		Guardian:       repository.NewGuardianRepository(db),
		Teacher:        repository.NewTeacherRepository(db),
		Class:          repository.NewClassRepository(db),
		Assignment:     repository.NewAssignmentRepository(db),
		Grade:          repository.NewGradeRepository(db),
		Attendance:     repository.NewAttendanceRepository(db),
		Subject:        repository.NewSubjectRepository(db),
		Timetable:      repository.NewTimetableRepository(db),
		Recommendation: repository.NewRecommendationRepository(db),
		Campaign:       repository.NewCampaignRepository(db),
		Message:        repository.NewMessageRepository(db),
		Resource:       repository.NewResourceRepository(db),
		Fiscal:         repository.NewFiscalRepository(db),
		Library:        repository.NewLibraryRepository(db),
		Extra:          repository.NewExtracurricularRepository(db),
		Intelligence:   repository.NewIntelligenceRepository(db),
		AcademicPeriod: repository.NewAcademicPeriodRepository(db),
		Scholastic:     repository.NewScholasticLevelRepository(db),
		Welfare:        repository.NewWelfareRepository(db),
		Logistics:      repository.NewLogisticsRepository(db),
		Facility:       repository.NewFacilityRepository(db),
		Homework:       repository.NewHomeworkRepository(db),
		Payment:        repository.NewPaymentRepository(db),
		Intervention:   repository.NewInterventionRepository(db),
		Document:       repository.NewDocumentRepository(db),
		Donation:       repository.NewDonationRepository(db),
		Blacklist:      repository.NewTokenBlacklistRepository(db),
		HR:             repository.NewHRRepository(db),
		Exam:           repository.NewExamRepository(db),
		Portfolio:      repository.NewPortfolioRepository(db),
		Communication:  repository.NewCommunicationRepository(db),
		DailyBill:      repository.NewDailyBillRepository(db),
		TerminalEvaluation: repository.NewTerminalEvaluationRepository(db),
		House:          repository.NewHouseRepository(db),
		Newsletter:     repository.NewNewsletterRepository(db),
		Ledger:         repository.NewLedgerRepository(db),
		CBT:            repository.NewCBTRepository(db),
		ReportCard:     repository.NewReportCardRepository(db),
		Stock:          repository.NewStockRepository(db),
		Procurement:    repository.NewProcurementRepository(db),
		Tracking:       repository.NewTrackingRepository(db),
		CampusOps:      repository.NewCampusOpsRepository(db),
	}
}

func initUseCases(repos *Repositories, infra *Infrastructure, db *gorm.DB, cfg *config.Config) *UseCases {
	campaignManager := usecase.NewCampaignManager(repos.Campaign, repos.Student, repos.User, infra.SMTP)
	fiscalUC := usecase.NewFiscalUseCase(repos.Fiscal, repos.Student, repos.Donation, repos.AcademicPeriod, repos.Tenant, repos.Communication)
	notifUC := usecase.NewNotificationUseCase(infra.Hub)

	return &UseCases{
		Audit:          usecase.NewAuditUseCase(repos.Audit),
		Tenant:         usecase.NewTenantUseCase(repos.Tenant, db, infra.SMTP, cfg, infra.Paystack),
		Department:     usecase.NewDepartmentUseCase(repos.Department),
		Student:        usecase.NewStudentUseCase(repos.Student, repos.Grade, repos.Attendance, repos.Welfare, repos.User, repos.Guardian, infra.SMTP),
		Academic:       usecase.NewAcademicUseCase(repos.Grade, repos.Attendance, repos.Student, repos.Subject, repos.Fiscal),
		Guardian:       usecase.NewGuardianUseCase(repos.Guardian, repos.Student, repos.Fiscal, repos.User, infra.SMTP),
		Teacher:        usecase.NewTeacherUseCase(repos.Teacher, repos.User, infra.SMTP),
		Class:          usecase.NewClassUseCase(repos.Class),
		Assignment:     usecase.NewAssignmentUseCase(repos.Assignment),
		Grade:          usecase.NewGradeUseCase(repos.Grade, notifUC),
		Subject:        usecase.NewSubjectUseCase(repos.Subject),
		Timetable:      usecase.NewTimetableUseCase(repos.Timetable, repos.Assignment),
		Analytics:      usecase.NewAnalyticsUseCase(repos.Attendance, repos.Grade, repos.Student, infra.PDF),
		Homework:       usecase.NewHomeworkUseCase(repos.Homework),
		Search:         usecase.NewSearchUseCase(repos.Student, repos.Teacher),
		Recommendation: usecase.NewRecommendationEngine(repos.Recommendation, repos.Grade, repos.Subject, repos.Student),
		Campaign:       campaignManager,
		Intelligence:   usecase.NewIntelligenceUseCase(repos.Intelligence, repos.Intervention, campaignManager),
		Message:        usecase.NewMessageUseCase(repos.Message),
		Fiscal:         fiscalUC,
		Attendance:     usecase.NewAttendanceUseCase(repos.Attendance, campaignManager, repos.Student, fiscalUC, repos.AcademicPeriod, notifUC),
		Resource:       usecase.NewResourceUseCase(repos.Resource),
		Library:        usecase.NewLibraryUseCase(repos.Library, repos.Fiscal),
		Extra:          usecase.NewExtracurricularUseCase(repos.Extra, repos.Timetable),
		AcademicPeriod: usecase.NewAcademicPeriodUseCase(repos.AcademicPeriod),
		Scholastic:     usecase.NewScholasticLevelUseCase(repos.Scholastic),
		Welfare:        usecase.NewWelfareUseCase(repos.Welfare, infra.SMS, repos.Student, repos.Guardian),
		Logistics:      usecase.NewLogisticsUseCase(repos.Logistics),
		Facility:       usecase.NewFacilityUseCase(repos.Facility),
		Payment:        usecase.NewPaymentUseCase(repos.Payment, repos.Fiscal, repos.User, repos.Tenant, infra.Paystack),
		Document:       usecase.NewDocumentUseCase(repos.Document, "./storage/uploads"),
		TeacherPortal:  usecase.NewTeacherPortalUseCase(repos.Teacher, repos.Student, repos.Grade, repos.Class, repos.Subject),
		HR:             usecase.NewHRUseCase(repos.HR, infra.PDF),
		Exam:           usecase.NewExamUseCase(repos.Exam),
		Portfolio:      usecase.NewPortfolioUseCase(repos.Portfolio),
		Communication:  usecase.NewCommunicationUseCase(repos.Communication, infra.SMS, repos.Guardian, repos.Student, repos.Teacher),
		DailyBill:      usecase.NewDailyBillUseCase(repos.DailyBill, repos.Student, repos.Fiscal, repos.Logistics),
		House:          usecase.NewHouseUseCase(repos.House),
		Newsletter:     usecase.NewNewsletterUseCase(repos.Newsletter, infra.SMTP, repos.Intelligence),
		Ledger:         usecase.NewLedgerUseCase(repos.Ledger),
		CBT:            usecase.NewCBTUseCase(repos.CBT),
		ReportCard:     usecase.NewReportCardUseCase(repos.ReportCard),
		Stock:          usecase.NewStockUseCase(repos.Stock),
		Procurement:    usecase.NewProcurementUseCase(repos.Procurement),
		Tracking:       usecase.NewTrackingUseCase(repos.Tracking),
		Notification:   notifUC,
		CampusOps:      usecase.NewCampusOpsUseCase(repos.CampusOps),
	}
}
