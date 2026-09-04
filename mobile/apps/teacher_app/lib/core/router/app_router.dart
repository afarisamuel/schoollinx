import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../features/attendance/presentation/pages/teacher_attendance_page.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/splash_page.dart';
import '../../features/auth/presentation/pages/tenant_select_page.dart';
import '../../features/daily_bills/presentation/pages/teacher_daily_bills_page.dart';
import '../../features/dashboard/presentation/pages/teacher_dashboard_page.dart';
import '../../features/grading/presentation/pages/teacher_grading_page.dart';
import '../../features/homework/presentation/pages/teacher_homework_page.dart';
import '../../features/hr/presentation/pages/teacher_leave_page.dart';
import '../../features/profile/presentation/pages/teacher_profile_page.dart';
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
      path: '/grading',
      builder: (context, state) => const TeacherGradingPage(),
    ),
    GoRoute(
      path: '/timetable',
      builder: (context, state) => const TeacherTimetablePage(),
    ),
    GoRoute(
      path: '/homework',
      builder: (context, state) => const TeacherHomeworkPage(),
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
      path: '/profile',
      builder: (context, state) => const TeacherProfilePage(),
    ),
  ],
);
