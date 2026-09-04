import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../core/widgets/teacher_drawer.dart';
import '../../features/attendance/presentation/pages/teacher_attendance_page.dart';
import '../../features/attendance/presentation/pages/teacher_parent_consultations_page.dart';
import '../../features/attendance/presentation/pages/teacher_seating_chart_page.dart';
import '../../features/attendance/presentation/pages/teacher_sickbay_referral_page.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/splash_page.dart';
import '../../features/auth/presentation/pages/tenant_select_page.dart';
import '../../features/daily_bills/presentation/pages/teacher_daily_bills_page.dart';
import '../../features/dashboard/presentation/pages/teacher_ai_copilot_page.dart';
import '../../features/dashboard/presentation/pages/teacher_dashboard_page.dart';
import '../../features/dashboard/presentation/pages/teacher_staff_notices_page.dart';
import '../../features/grading/presentation/pages/teacher_cbt_builder_page.dart';
import '../../features/grading/presentation/pages/teacher_conduct_merits_page.dart';
import '../../features/grading/presentation/pages/teacher_grading_page.dart';
import '../../features/homework/presentation/pages/teacher_homework_page.dart';
import '../../features/homework/presentation/pages/teacher_lesson_planner_page.dart';
import '../../features/hr/presentation/pages/teacher_leave_page.dart';
import '../../features/hr/presentation/pages/teacher_payslips_page.dart';
import '../../features/profile/presentation/pages/teacher_profile_page.dart';
import '../../features/timetable/presentation/pages/teacher_cover_board_page.dart';
import '../../features/timetable/presentation/pages/teacher_timetable_page.dart';

final appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const SplashPage(),
    ),
    GoRoute(
      path: '/tenant-select',
      builder: (context, state) => const TenantSelectPage(),
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginPage(),
    ),
    GoRoute(
      path: '/dashboard',
      builder: (context, state) => const TeacherDashboardPage(),
    ),
    GoRoute(
      path: '/attendance',
      builder: (context, state) => const TeacherAttendancePage(),
    ),
    GoRoute(
      path: '/seating-charts',
      builder: (context, state) => const TeacherSeatingChartPage(),
    ),
    GoRoute(
      path: '/sickbay-referral',
      builder: (context, state) => const TeacherSickbayReferralPage(),
    ),
    GoRoute(
      path: '/parent-consultations',
      builder: (context, state) => const TeacherParentConsultationsPage(),
    ),
    GoRoute(
      path: '/grading',
      builder: (context, state) => const TeacherGradingPage(),
    ),
    GoRoute(
      path: '/cbt-builder',
      builder: (context, state) => const TeacherCbtBuilderPage(),
    ),
    GoRoute(
      path: '/conduct-merits',
      builder: (context, state) => const TeacherConductMeritsPage(),
    ),
    GoRoute(
      path: '/timetable',
      builder: (context, state) => const TeacherTimetablePage(),
    ),
    GoRoute(
      path: '/cover-board',
      builder: (context, state) => const TeacherCoverBoardPage(),
    ),
    GoRoute(
      path: '/homework',
      builder: (context, state) => const TeacherHomeworkPage(),
    ),
    GoRoute(
      path: '/lesson-planner',
      builder: (context, state) => const TeacherLessonPlannerPage(),
    ),
    GoRoute(
      path: '/daily-bills',
      builder: (context, state) => const TeacherDailyBillsPage(),
    ),
    GoRoute(
      path: '/leave',
      builder: (context, state) => BlocProvider<HrPortalBloc>(
        create: (_) => sl<HrPortalBloc>(),
        child: const TeacherLeavePage(),
      ),
    ),
    GoRoute(
      path: '/payslips',
      builder: (context, state) => const TeacherPayslipsPage(),
    ),
    GoRoute(
      path: '/staff-notices',
      builder: (context, state) => const TeacherStaffNoticesPage(),
    ),
    GoRoute(
      path: '/ai-copilot',
      builder: (context, state) => const TeacherAiCopilotPage(),
    ),
    GoRoute(
      path: '/messaging',
      builder: (context, state) => const MessagingCenterPage(
        appTitle: 'SchoolLinx Teacher',
        drawer: TeacherDrawer(currentRoute: '/messaging'),
      ),
    ),
    GoRoute(
      path: '/library',
      builder: (context, state) => const DigitalLibraryPage(
        drawer: TeacherDrawer(currentRoute: '/library'),
      ),
    ),
    GoRoute(
      path: '/cloud-resources',
      builder: (context, state) => const CloudResourcesPage(
        drawer: TeacherDrawer(currentRoute: '/cloud-resources'),
      ),
    ),
    GoRoute(
      path: '/clubs',
      builder: (context, state) => const StudentClubsPage(
        drawer: TeacherDrawer(currentRoute: '/clubs'),
      ),
    ),
    GoRoute(
      path: '/profile',
      builder: (context, state) => const TeacherProfilePage(),
    ),
  ],
);
