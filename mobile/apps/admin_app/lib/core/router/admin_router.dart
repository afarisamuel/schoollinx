import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../features/auth/presentation/pages/admin_login_page.dart';
import '../../features/auth/presentation/pages/admin_splash_page.dart';
import '../../features/auth/presentation/pages/admin_tenant_select_page.dart';
import '../../features/broadcast/presentation/pages/admin_broadcast_page.dart';
import '../../features/dashboard/presentation/pages/admin_dashboard_page.dart';
import '../../features/defaulters/presentation/pages/admin_defaulters_page.dart';
import '../../features/finance/presentation/pages/admin_finance_page.dart';
import '../../features/logistics/presentation/pages/admin_logistics_page.dart';
import '../../features/profile/presentation/pages/admin_profile_page.dart';
import '../../features/users/presentation/pages/admin_users_page.dart';
import '../../features/welfare/presentation/pages/admin_clinic_hostel_page.dart';

final adminRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const AdminSplashPage(),
    ),
    GoRoute(
      path: '/tenant-select',
      builder: (context, state) => const AdminTenantSelectPage(),
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) => const AdminLoginPage(),
    ),
    GoRoute(
      path: '/dashboard',
      builder: (context, state) => const AdminDashboardPage(),
    ),
    GoRoute(
      path: '/users',
      builder: (context, state) => const AdminUsersPage(),
    ),
    GoRoute(
      path: '/finance',
      builder: (context, state) => const AdminFinancePage(),
    ),
    GoRoute(
      path: '/defaulters',
      builder: (context, state) => const AdminDefaultersPage(),
    ),
    GoRoute(
      path: '/logistics',
      builder: (context, state) => const AdminLogisticsPage(),
    ),
    GoRoute(
      path: '/broadcast',
      builder: (context, state) => const AdminBroadcastPage(),
    ),
    GoRoute(
      path: '/clinic-hostel',
      builder: (context, state) => BlocProvider<WelfareBloc>(
        create: (_) => sl<WelfareBloc>(),
        child: const AdminClinicHostelPage(),
      ),
    ),
    GoRoute(
      path: '/profile',
      builder: (context, state) => const AdminProfilePage(),
    ),
  ],
);
