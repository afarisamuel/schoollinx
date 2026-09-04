import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../features/absence/presentation/pages/parent_absence_page.dart';
import '../../features/academics/presentation/pages/parent_academics_page.dart';
import '../../features/auth/presentation/pages/parent_login_page.dart';
import '../../features/auth/presentation/pages/parent_splash_page.dart';
import '../../features/auth/presentation/pages/parent_tenant_select_page.dart';
import '../../features/bus/presentation/pages/parent_bus_tracker_page.dart';
import '../../features/dashboard/presentation/pages/parent_dashboard_page.dart';
import '../../features/fees/presentation/pages/parent_fees_page.dart';
import '../../features/profile/presentation/pages/parent_profile_page.dart';
import '../../features/pta/presentation/pages/parent_pta_page.dart';
import '../../features/wallet/presentation/pages/parent_wallet_page.dart';
import '../../features/welfare/presentation/pages/child_health_card_page.dart';

final parentRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const ParentSplashPage(),
    ),
    GoRoute(
      path: '/tenant-select',
      builder: (context, state) => const ParentTenantSelectPage(),
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) => const ParentLoginPage(),
    ),
    GoRoute(
      path: '/dashboard',
      builder: (context, state) => const ParentDashboardPage(),
    ),
    GoRoute(
      path: '/fees',
      builder: (context, state) => const ParentFeesPage(),
    ),
    GoRoute(
      path: '/bus',
      builder: (context, state) => const ParentBusTrackerPage(),
    ),
    GoRoute(
      path: '/academics',
      builder: (context, state) => const ParentAcademicsPage(),
    ),
    GoRoute(
      path: '/absence',
      builder: (context, state) => const ParentAbsencePage(),
    ),
    GoRoute(
      path: '/wallet',
      builder: (context, state) => const ParentWalletPage(),
    ),
    GoRoute(
      path: '/pta',
      builder: (context, state) => const ParentPTAPage(),
    ),
    GoRoute(
      path: '/health-card',
      builder: (context, state) {
        final extra = state.extra as Map<String, dynamic>?;
        final studentId = extra?['student_id'] ?? '';
        final studentName = extra?['student_name'] ?? 'Ward Health Card';
        return BlocProvider<WelfareBloc>(
          create: (_) => sl<WelfareBloc>(),
          child: ChildHealthCardPage(
            studentId: studentId,
            studentName: studentName,
          ),
        );
      },
    ),
    GoRoute(
      path: '/profile',
      builder: (context, state) => const ParentProfilePage(),
    ),
  ],
);
