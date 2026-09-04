import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../core/widgets/student_drawer.dart';
import '../../features/academics/presentation/pages/student_learning_path_page.dart';
import '../../features/auth/presentation/pages/student_login_page.dart';
import '../../features/auth/presentation/pages/student_splash_page.dart';
import '../../features/auth/presentation/pages/student_tenant_select_page.dart';
import '../../features/cbt/presentation/pages/student_cbt_page.dart';
import '../../features/dashboard/presentation/pages/student_dashboard_page.dart';
import '../../features/homework/presentation/pages/student_homework_page.dart';
import '../../features/id_card/presentation/pages/student_id_card_page.dart';
import '../../features/portfolio/presentation/pages/student_portfolio_page.dart';
import '../../features/profile/presentation/pages/student_profile_page.dart';
import '../../features/timetable/presentation/pages/student_timetable_page.dart';

final studentRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const StudentSplashPage(),
    ),
    GoRoute(
      path: '/tenant-select',
      builder: (context, state) => const StudentTenantSelectPage(),
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) => const StudentLoginPage(),
    ),
    GoRoute(
      path: '/dashboard',
      builder: (context, state) => const StudentDashboardPage(),
    ),
    GoRoute(
      path: '/learning-path',
      builder: (context, state) => const StudentLearningPathPage(),
    ),
    GoRoute(
      path: '/timetable',
      builder: (context, state) => const StudentTimetablePage(),
    ),
    GoRoute(
      path: '/homework',
      builder: (context, state) => const StudentHomeworkPage(),
    ),
    GoRoute(
      path: '/cbt',
      builder: (context, state) => const StudentCBTPage(),
    ),
    GoRoute(
      path: '/library',
      builder: (context, state) => const DigitalLibraryPage(
        drawer: StudentDrawer(currentRoute: '/library'),
      ),
    ),
    GoRoute(
      path: '/cloud-resources',
      builder: (context, state) => const CloudResourcesPage(
        drawer: StudentDrawer(currentRoute: '/cloud-resources'),
      ),
    ),
    GoRoute(
      path: '/clubs',
      builder: (context, state) => const StudentClubsPage(
        drawer: StudentDrawer(currentRoute: '/clubs'),
      ),
    ),
    GoRoute(
      path: '/messaging',
      builder: (context, state) => const MessagingCenterPage(
        appTitle: 'SchoolLinx Student',
        drawer: StudentDrawer(currentRoute: '/messaging'),
      ),
    ),
    GoRoute(
      path: '/id-card',
      builder: (context, state) => const StudentIdCardPage(),
    ),
    GoRoute(
      path: '/portfolio',
      builder: (context, state) => BlocProvider<HouseMeritBloc>(
        create: (_) => sl<HouseMeritBloc>(),
        child: const StudentPortfolioPage(),
      ),
    ),
    GoRoute(
      path: '/profile',
      builder: (context, state) => const StudentProfilePage(),
    ),
  ],
);
