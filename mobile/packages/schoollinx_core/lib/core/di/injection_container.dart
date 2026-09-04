import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:get_it/get_it.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../network/api_client.dart';
import '../network/interceptors/auth_interceptor.dart';
import '../network/interceptors/tenant_interceptor.dart';

// Academics
import '../../features/academics/data/datasources/academic_remote_datasource.dart';
import '../../features/academics/data/repositories/academic_repository_impl.dart';
import '../../features/academics/domain/repositories/academic_repository.dart';
import '../../features/academics/domain/usecases/academics_usecases.dart';
import '../../features/academics/presentation/bloc/attendance_bloc.dart';
import '../../features/academics/presentation/bloc/grading_bloc.dart';
import '../../features/academics/presentation/bloc/homework_bloc.dart';
import '../../features/academics/presentation/bloc/timetable_bloc.dart';
import '../../features/academics/presentation/bloc/cbt_bloc.dart';
import '../../features/academics/presentation/bloc/library_bloc.dart';

// Auth
import '../../features/auth/data/datasources/auth_local_datasource.dart';
import '../../features/auth/data/datasources/auth_remote_datasource.dart';
import '../../features/auth/data/repositories/auth_repository_impl.dart';
import '../../features/auth/domain/repositories/auth_repository.dart';
import '../../features/auth/domain/usecases/get_current_user_usecase.dart';
import '../../features/auth/domain/usecases/login_usecase.dart';
import '../../features/auth/domain/usecases/logout_usecase.dart';
import '../../features/auth/domain/usecases/resolve_tenant_usecase.dart';
import '../../features/auth/domain/usecases/search_tenants_usecase.dart';
import '../../features/auth/presentation/bloc/auth_bloc.dart';

// Communication
import '../../features/communication/data/datasources/communication_remote_datasource.dart';
import '../../features/communication/data/repositories/communication_repository_impl.dart';
import '../../features/communication/domain/repositories/communication_repository.dart';
import '../../features/communication/domain/usecases/communication_usecases.dart';
import '../../features/communication/presentation/bloc/communication_bloc.dart';

// Daily Bills
import '../../features/daily_bills/data/datasources/daily_bill_remote_datasource.dart';
import '../../features/daily_bills/data/repositories/daily_bill_repository_impl.dart';
import '../../features/daily_bills/domain/repositories/daily_bill_repository.dart';
import '../../features/daily_bills/domain/usecases/daily_bills_usecases.dart';
import '../../features/daily_bills/presentation/bloc/daily_bills_bloc.dart';

// Finance
import '../../features/finance/data/datasources/finance_remote_datasource.dart';
import '../../features/finance/data/repositories/finance_repository_impl.dart';
import '../../features/finance/domain/repositories/finance_repository.dart';
import '../../features/finance/domain/usecases/finance_usecases.dart';
import '../../features/finance/presentation/bloc/finance_bloc.dart';
import '../../features/finance/presentation/bloc/defaulters_bloc.dart';

// Guardian
import '../../features/guardian/data/datasources/guardian_remote_datasource.dart';
import '../../features/guardian/data/repositories/guardian_repository_impl.dart';
import '../../features/guardian/domain/repositories/guardian_repository.dart';
import '../../features/guardian/domain/usecases/guardian_usecases.dart';
import '../../features/guardian/presentation/bloc/guardian_bloc.dart';
import '../../features/guardian/presentation/bloc/absence_bloc.dart';
import '../../features/guardian/presentation/bloc/pta_bloc.dart';
import '../../features/guardian/presentation/bloc/wallet_bloc.dart';

// Logistics
import '../../features/logistics/data/datasources/logistics_remote_datasource.dart';
import '../../features/logistics/data/repositories/logistics_repository_impl.dart';
import '../../features/logistics/domain/repositories/logistics_repository.dart';
import '../../features/logistics/domain/usecases/logistics_usecases.dart';
import '../../features/logistics/presentation/bloc/logistics_bloc.dart';

// Welfare
import '../../features/welfare/data/datasources/welfare_remote_data_source.dart';
import '../../features/welfare/data/repositories/welfare_repository_impl.dart';
import '../../features/welfare/domain/repositories/welfare_repository.dart';
import '../../features/welfare/domain/usecases/welfare_usecases.dart';
import '../../features/welfare/presentation/bloc/welfare_bloc.dart';

// House Merit
import '../../features/house_merit/data/datasources/house_merit_remote_data_source.dart';
import '../../features/house_merit/data/repositories/house_merit_repository_impl.dart';
import '../../features/house_merit/domain/repositories/house_merit_repository.dart';
import '../../features/house_merit/domain/usecases/house_merit_usecases.dart';
import '../../features/house_merit/presentation/bloc/house_merit_bloc.dart';

// HR Portal
import '../../features/hr_portal/data/datasources/hr_portal_remote_data_source.dart';
import '../../features/hr_portal/data/repositories/hr_portal_repository_impl.dart';
import '../../features/hr_portal/domain/repositories/hr_portal_repository.dart';
import '../../features/hr_portal/domain/usecases/hr_portal_usecases.dart';
import '../../features/hr_portal/presentation/bloc/hr_portal_bloc.dart';

// Intelligence
import '../../features/intelligence/data/datasources/intelligence_remote_datasource.dart';
import '../../features/intelligence/data/repositories/intelligence_repository_impl.dart';
import '../../features/intelligence/domain/repositories/intelligence_repository.dart';
import '../../features/intelligence/domain/usecases/get_institutional_kpis_usecase.dart';
import '../../features/intelligence/presentation/bloc/intelligence_bloc.dart';

final sl = GetIt.instance;

Future<void> initCoreDependencies({String? customBaseUrl}) async {
  // External
  final sharedPreferences = await SharedPreferences.getInstance();
  const secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  sl.registerLazySingleton<SharedPreferences>(() => sharedPreferences);
  sl.registerLazySingleton<FlutterSecureStorage>(() => secureStorage);

  // Local DataSources
  sl.registerLazySingleton<AuthLocalDataSource>(
    () => AuthLocalDataSourceImpl(
      secureStorage: sl(),
      sharedPreferences: sl(),
    ),
  );

  // Network & Interceptors
  sl.registerLazySingleton<AuthInterceptor>(
    () => AuthInterceptor(localDataSource: sl()),
  );
  sl.registerLazySingleton<TenantInterceptor>(
    () => TenantInterceptor(localDataSource: sl()),
  );
  sl.registerLazySingleton<ApiClient>(
    () => ApiClient(
      authInterceptor: sl(),
      tenantInterceptor: sl(),
      baseUrl: customBaseUrl,
    ),
  );

  // Remote DataSources
  sl.registerLazySingleton<AuthRemoteDataSource>(
    () => AuthRemoteDataSourceImpl(apiClient: sl()),
  );
  sl.registerLazySingleton<AcademicRemoteDataSource>(
    () => AcademicRemoteDataSourceImpl(apiClient: sl()),
  );
  sl.registerLazySingleton<FinanceRemoteDataSource>(
    () => FinanceRemoteDataSourceImpl(apiClient: sl()),
  );
  sl.registerLazySingleton<CommunicationRemoteDataSource>(
    () => CommunicationRemoteDataSource(apiClient: sl()),
  );
  sl.registerLazySingleton<GuardianRemoteDataSource>(
    () => GuardianRemoteDataSource(apiClient: sl()),
  );
  sl.registerLazySingleton<LogisticsRemoteDataSource>(
    () => LogisticsRemoteDataSource(apiClient: sl()),
  );
  sl.registerLazySingleton<DailyBillRemoteDataSource>(
    () => DailyBillRemoteDataSource(apiClient: sl()),
  );
  sl.registerLazySingleton<WelfareRemoteDataSource>(
    () => WelfareRemoteDataSourceImpl(apiClient: sl()),
  );
  sl.registerLazySingleton<HouseMeritRemoteDataSource>(
    () => HouseMeritRemoteDataSourceImpl(apiClient: sl()),
  );
  sl.registerLazySingleton<HrPortalRemoteDataSource>(
    () => HrPortalRemoteDataSourceImpl(apiClient: sl()),
  );

  // Repositories
  sl.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(
      remoteDataSource: sl(),
      localDataSource: sl(),
    ),
  );
  sl.registerLazySingleton<AcademicRepository>(
    () => AcademicRepositoryImpl(
      remoteDataSource: sl(),
    ),
  );
  sl.registerLazySingleton<FinanceRepository>(
    () => FinanceRepositoryImpl(
      remoteDataSource: sl(),
    ),
  );
  sl.registerLazySingleton<CommunicationRepository>(
    () => CommunicationRepositoryImpl(
      remoteDataSource: sl(),
    ),
  );
  sl.registerLazySingleton<GuardianRepository>(
    () => GuardianRepositoryImpl(
      remoteDataSource: sl(),
    ),
  );
  sl.registerLazySingleton<LogisticsRepository>(
    () => LogisticsRepositoryImpl(
      remoteDataSource: sl(),
    ),
  );
  sl.registerLazySingleton<DailyBillRepository>(
    () => DailyBillRepositoryImpl(
      remoteDataSource: sl(),
    ),
  );
  sl.registerLazySingleton<WelfareRepository>(
    () => WelfareRepositoryImpl(
      remoteDataSource: sl(),
    ),
  );
  sl.registerLazySingleton<HouseMeritRepository>(
    () => HouseMeritRepositoryImpl(
      remoteDataSource: sl(),
    ),
  );
  sl.registerLazySingleton<HrPortalRepository>(
    () => HrPortalRepositoryImpl(
      remoteDataSource: sl(),
    ),
  );

  // Use Cases - Auth
  sl.registerLazySingleton<LoginUseCase>(() => LoginUseCase(sl()));
  sl.registerLazySingleton<LogoutUseCase>(() => LogoutUseCase(sl()));
  sl.registerLazySingleton<GetCurrentUserUseCase>(() => GetCurrentUserUseCase(sl()));
  sl.registerLazySingleton<ResolveTenantUseCase>(() => ResolveTenantUseCase(sl()));
  sl.registerLazySingleton<SearchTenantsUseCase>(() => SearchTenantsUseCase(sl()));

  // Use Cases - Academics
  sl.registerLazySingleton<GetClassesUseCase>(() => GetClassesUseCase(sl()));
  sl.registerLazySingleton<GetStudentsByClassUseCase>(() => GetStudentsByClassUseCase(sl()));
  sl.registerLazySingleton<GetAllStudentsUseCase>(() => GetAllStudentsUseCase(sl()));
  sl.registerLazySingleton<GetAllTeachersUseCase>(() => GetAllTeachersUseCase(sl()));
  sl.registerLazySingleton<MarkBulkAttendanceUseCase>(() => MarkBulkAttendanceUseCase(sl()));
  sl.registerLazySingleton<SaveGradesUseCase>(() => SaveGradesUseCase(sl()));
  sl.registerLazySingleton<GetHomeworkByClassUseCase>(() => GetHomeworkByClassUseCase(sl()));
  sl.registerLazySingleton<CreateHomeworkUseCase>(() => CreateHomeworkUseCase(sl()));
  sl.registerLazySingleton<GetHomeworkSubmissionsUseCase>(() => GetHomeworkSubmissionsUseCase(sl()));
  sl.registerLazySingleton<GradeHomeworkSubmissionUseCase>(() => GradeHomeworkSubmissionUseCase(sl()));
  sl.registerLazySingleton<SubmitHomeworkUseCase>(() => SubmitHomeworkUseCase(sl()));
  sl.registerLazySingleton<GetClassTimetableUseCase>(() => GetClassTimetableUseCase(sl()));
  sl.registerLazySingleton<GetTeacherTimetableUseCase>(() => GetTeacherTimetableUseCase(sl()));
  sl.registerLazySingleton<GetLibraryBooksUseCase>(() => GetLibraryBooksUseCase(sl()));
  sl.registerLazySingleton<GetCBTQuizzesUseCase>(() => GetCBTQuizzesUseCase(sl()));

  // Use Cases - Finance
  sl.registerLazySingleton<GetFiscalSummaryUseCase>(() => GetFiscalSummaryUseCase(sl()));
  sl.registerLazySingleton<GetFeeRecordsUseCase>(() => GetFeeRecordsUseCase(sl()));
  sl.registerLazySingleton<GetDefaultersUseCase>(() => GetDefaultersUseCase(sl()));
  sl.registerLazySingleton<SendDefaultersDunningSmsUseCase>(() => SendDefaultersDunningSmsUseCase(sl()));
  sl.registerLazySingleton<InitializePaymentUseCase>(() => InitializePaymentUseCase(sl()));
  sl.registerLazySingleton<VerifyPaymentUseCase>(() => VerifyPaymentUseCase(sl()));

  // Use Cases - Logistics
  sl.registerLazySingleton<GetBusRoutesUseCase>(() => GetBusRoutesUseCase(sl()));
  sl.registerLazySingleton<GetRouteLocationUseCase>(() => GetRouteLocationUseCase(sl()));
  sl.registerLazySingleton<GetGatePassUseCase>(() => GetGatePassUseCase(sl()));
  sl.registerLazySingleton<GetFleetSummaryUseCase>(() => GetFleetSummaryUseCase(sl()));

  // Use Cases - Guardian
  sl.registerLazySingleton<GetChildrenUseCase>(() => GetChildrenUseCase(sl()));
  sl.registerLazySingleton<GetChildAcademicsUseCase>(() => GetChildAcademicsUseCase(sl()));
  sl.registerLazySingleton<GetFamilyLedgerUseCase>(() => GetFamilyLedgerUseCase(sl()));
  sl.registerLazySingleton<GetPickupPassUseCase>(() => GetPickupPassUseCase(sl()));
  sl.registerLazySingleton<GeneratePickupOtpUseCase>(() => GeneratePickupOtpUseCase(sl()));
  sl.registerLazySingleton<GetAbsenceRequestsUseCase>(() => GetAbsenceRequestsUseCase(sl()));
  sl.registerLazySingleton<SubmitAbsenceRequestUseCase>(() => SubmitAbsenceRequestUseCase(sl()));
  sl.registerLazySingleton<GetStudentWalletUseCase>(() => GetStudentWalletUseCase(sl()));
  sl.registerLazySingleton<TopupStudentWalletUseCase>(() => TopupStudentWalletUseCase(sl()));
  sl.registerLazySingleton<GetTeacherMeetingSlotsUseCase>(() => GetTeacherMeetingSlotsUseCase(sl()));
  sl.registerLazySingleton<BookMeetingSlotUseCase>(() => BookMeetingSlotUseCase(sl()));

  // Use Cases - Daily Bills
  sl.registerLazySingleton<GetPendingDailyBillsUseCase>(() => GetPendingDailyBillsUseCase(sl()));
  sl.registerLazySingleton<GetMyDailyCollectionsUseCase>(() => GetMyDailyCollectionsUseCase(sl()));
  sl.registerLazySingleton<CollectDailyBillUseCase>(() => CollectDailyBillUseCase(sl()));
  sl.registerLazySingleton<ReconcileShiftUseCase>(() => ReconcileShiftUseCase(sl()));

  // Use Cases - Communication
  sl.registerLazySingleton<GetNoticesUseCase>(() => GetNoticesUseCase(sl()));
  sl.registerLazySingleton<SendBroadcastUseCase>(() => SendBroadcastUseCase(sl()));

  // Use Cases - Welfare
  sl.registerLazySingleton<GetStudentClinicVisitsUseCase>(() => GetStudentClinicVisitsUseCase(sl()));
  sl.registerLazySingleton<GetActiveClinicVisitsUseCase>(() => GetActiveClinicVisitsUseCase(sl()));
  sl.registerLazySingleton<LogClinicVisitUseCase>(() => LogClinicVisitUseCase(sl()));
  sl.registerLazySingleton<GetHostelRoomsUseCase>(() => GetHostelRoomsUseCase(sl()));

  // Use Cases - House Merit
  sl.registerLazySingleton<GetHouseLeaderboardUseCase>(() => GetHouseLeaderboardUseCase(sl()));
  sl.registerLazySingleton<GetStudentMeritHistoryUseCase>(() => GetStudentMeritHistoryUseCase(sl()));
  sl.registerLazySingleton<AwardMeritPointsUseCase>(() => AwardMeritPointsUseCase(sl()));

  // Use Cases - HR Portal
  sl.registerLazySingleton<GetMyLeaveApplicationsUseCase>(() => GetMyLeaveApplicationsUseCase(sl()));
  sl.registerLazySingleton<ApplyForLeaveUseCase>(() => ApplyForLeaveUseCase(sl()));
  sl.registerLazySingleton<GetMyPayslipsUseCase>(() => GetMyPayslipsUseCase(sl()));

  // BLoCs
  sl.registerFactory<AuthBloc>(
    () => AuthBloc(
      loginUseCase: sl(),
      logoutUseCase: sl(),
      getCurrentUserUseCase: sl(),
      resolveTenantUseCase: sl(),
      authRepository: sl(),
    ),
  );

  sl.registerFactory<AttendanceBloc>(
    () => AttendanceBloc(
      getClassesUseCase: sl(),
      getStudentsByClassUseCase: sl(),
      markBulkAttendanceUseCase: sl(),
    ),
  );

  sl.registerFactory<GradingBloc>(
    () => GradingBloc(
      getClassesUseCase: sl(),
      getStudentsByClassUseCase: sl(),
      saveGradesUseCase: sl(),
    ),
  );

  sl.registerFactory<HomeworkBloc>(
    () => HomeworkBloc(
      getClassesUseCase: sl(),
      getHomeworkByClassUseCase: sl(),
      createHomeworkUseCase: sl(),
      getHomeworkSubmissionsUseCase: sl(),
      gradeHomeworkSubmissionUseCase: sl(),
      submitHomeworkUseCase: sl(),
    ),
  );

  sl.registerFactory<TimetableBloc>(
    () => TimetableBloc(
      getClassTimetableUseCase: sl(),
      getTeacherTimetableUseCase: sl(),
    ),
  );

  sl.registerFactory<CbtBloc>(
    () => CbtBloc(
      getCbtQuizzesUseCase: sl(),
    ),
  );

  sl.registerFactory<LibraryBloc>(
    () => LibraryBloc(
      getLibraryBooksUseCase: sl(),
    ),
  );

  sl.registerFactory<FinanceBloc>(
    () => FinanceBloc(
      getFiscalSummaryUseCase: sl(),
      getFeeRecordsUseCase: sl(),
      initializePaymentUseCase: sl(),
      verifyPaymentUseCase: sl(),
    ),
  );

  sl.registerFactory<DefaultersBloc>(
    () => DefaultersBloc(
      getDefaultersUseCase: sl(),
      sendDefaultersDunningSmsUseCase: sl(),
    ),
  );

  sl.registerFactory<LogisticsBloc>(
    () => LogisticsBloc(
      getBusRoutesUseCase: sl(),
      getRouteLocationUseCase: sl(),
      getGatePassUseCase: sl(),
      getFleetSummaryUseCase: sl(),
    ),
  );

  sl.registerFactory<GuardianBloc>(
    () => GuardianBloc(
      getChildrenUseCase: sl(),
      getChildAcademicsUseCase: sl(),
      getPickupPassUseCase: sl(),
    ),
  );

  sl.registerFactory<AbsenceBloc>(
    () => AbsenceBloc(
      getAbsenceRequestsUseCase: sl(),
      submitAbsenceRequestUseCase: sl(),
    ),
  );

  sl.registerFactory<PtaBloc>(
    () => PtaBloc(
      getAllTeachersUseCase: sl(),
      getTeacherMeetingSlotsUseCase: sl(),
      bookMeetingSlotUseCase: sl(),
    ),
  );

  sl.registerFactory<WalletBloc>(
    () => WalletBloc(
      getStudentWalletUseCase: sl(),
      topupStudentWalletUseCase: sl(),
    ),
  );

  sl.registerFactory<DailyBillsBloc>(
    () => DailyBillsBloc(
      getPendingDailyBillsUseCase: sl(),
      getMyDailyCollectionsUseCase: sl(),
      collectDailyBillUseCase: sl(),
      reconcileShiftUseCase: sl(),
    ),
  );

  sl.registerFactory<CommunicationBloc>(
    () => CommunicationBloc(
      getNoticesUseCase: sl(),
      sendBroadcastUseCase: sl(),
    ),
  );

  sl.registerFactory<WelfareBloc>(
    () => WelfareBloc(
      getStudentClinicVisits: sl(),
      getActiveClinicVisits: sl(),
      logClinicVisit: sl(),
      getHostelRooms: sl(),
    ),
  );

  sl.registerFactory<HouseMeritBloc>(
    () => HouseMeritBloc(
      getHouseLeaderboard: sl(),
      getStudentMeritHistory: sl(),
      awardMeritPoints: sl(),
    ),
  );

  // Intelligence
  sl.registerLazySingleton<IntelligenceRemoteDataSource>(
    () => IntelligenceRemoteDataSourceImpl(apiClient: sl()),
  );
  sl.registerLazySingleton<IntelligenceRepository>(
    () => IntelligenceRepositoryImpl(remoteDataSource: sl()),
  );
  sl.registerLazySingleton<GetInstitutionalKpisUseCase>(
    () => GetInstitutionalKpisUseCase(sl()),
  );
  sl.registerFactory<IntelligenceBloc>(
    () => IntelligenceBloc(getInstitutionalKpisUseCase: sl()),
  );

  sl.registerFactory<HrPortalBloc>(
    () => HrPortalBloc(
      getMyLeaveApplications: sl(),
      applyForLeave: sl(),
      getMyPayslips: sl(),
    ),
  );
}

