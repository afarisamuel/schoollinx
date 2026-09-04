import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../core/widgets/admin_drawer.dart';
import '../../features/academic/presentation/pages/admin_academic_hub_page.dart';
import '../../features/analytics/presentation/pages/admin_demand_forecaster_page.dart';
import '../../features/analytics/presentation/pages/admin_retention_matrix_page.dart';
import '../../features/auth/presentation/pages/admin_login_page.dart';
import '../../features/auth/presentation/pages/admin_splash_page.dart';
import '../../features/auth/presentation/pages/admin_tenant_select_page.dart';
import '../../features/broadcast/presentation/pages/admin_broadcast_page.dart';
import '../../features/broadcast/presentation/pages/admin_newsletters_page.dart';
import '../../features/dashboard/presentation/pages/admin_dashboard_page.dart';
import '../../features/defaulters/presentation/pages/admin_defaulters_page.dart';
import '../../features/finance/presentation/pages/admin_budget_page.dart';
import '../../features/finance/presentation/pages/admin_expense_claims_page.dart';
import '../../features/finance/presentation/pages/admin_fee_structures_page.dart';
import '../../features/finance/presentation/pages/admin_finance_page.dart';
import '../../features/finance/presentation/pages/admin_pos_page.dart';
import '../../features/finance/presentation/pages/admin_scholarships_page.dart';
import '../../features/finance/presentation/pages/admin_subscription_page.dart';
import '../../features/logistics/presentation/pages/admin_logistics_page.dart';
import '../../features/operations/presentation/pages/admin_assets_page.dart';
import '../../features/operations/presentation/pages/admin_biometrics_page.dart';
import '../../features/operations/presentation/pages/admin_departments_page.dart';
import '../../features/operations/presentation/pages/admin_facilities_page.dart';
import '../../features/operations/presentation/pages/admin_hr_policies_page.dart';
import '../../features/profile/presentation/pages/admin_profile_page.dart';
import '../../features/registry/presentation/pages/admin_enrollment_page.dart';
import '../../features/registry/presentation/pages/admin_guardians_page.dart';
import '../../features/registry/presentation/pages/admin_promotions_page.dart';
import '../../features/registry/presentation/pages/admin_staff_page.dart';
import '../../features/settings/presentation/pages/admin_super_controls_page.dart';
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
      path: '/academic-hub',
      builder: (context, state) => const AdminAcademicHubPage(),
    ),
    GoRoute(
      path: '/users',
      builder: (context, state) => const AdminUsersPage(),
    ),
    GoRoute(
      path: '/enrollment',
      builder: (context, state) => const AdminEnrollmentPage(),
    ),
    GoRoute(
      path: '/promotions',
      builder: (context, state) => const AdminPromotionsPage(),
    ),
    GoRoute(
      path: '/staff',
      builder: (context, state) => const AdminStaffPage(),
    ),
    GoRoute(
      path: '/guardians',
      builder: (context, state) => const AdminGuardiansPage(),
    ),
    GoRoute(
      path: '/finance',
      builder: (context, state) => const AdminFinancePage(),
    ),
    GoRoute(
      path: '/fee-structures',
      builder: (context, state) => const AdminFeeStructuresPage(),
    ),
    GoRoute(
      path: '/pos',
      builder: (context, state) => const AdminPosPage(),
    ),
    GoRoute(
      path: '/budget-planning',
      builder: (context, state) => const AdminBudgetPage(),
    ),
    GoRoute(
      path: '/expenses',
      builder: (context, state) => const AdminExpenseClaimsPage(),
    ),
    GoRoute(
      path: '/scholarships',
      builder: (context, state) => const AdminScholarshipsPage(),
    ),
    GoRoute(
      path: '/subscriptions',
      builder: (context, state) => const AdminSubscriptionPage(),
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
      path: '/biometrics',
      builder: (context, state) => const AdminBiometricsPage(),
    ),
    GoRoute(
      path: '/facilities',
      builder: (context, state) => const AdminFacilitiesPage(),
    ),
    GoRoute(
      path: '/assets',
      builder: (context, state) => const AdminAssetsPage(),
    ),
    GoRoute(
      path: '/hr-policies',
      builder: (context, state) => const AdminHrPoliciesPage(),
    ),
    GoRoute(
      path: '/departments',
      builder: (context, state) => const AdminDepartmentsPage(),
    ),
    GoRoute(
      path: '/broadcast',
      builder: (context, state) => const AdminBroadcastPage(),
    ),
    GoRoute(
      path: '/messaging',
      builder: (context, state) => const MessagingCenterPage(
        appTitle: 'SchoolLinx Admin',
        drawer: AdminDrawer(currentRoute: '/messaging'),
      ),
    ),
    GoRoute(
      path: '/newsletters',
      builder: (context, state) => const AdminNewslettersPage(),
    ),
    GoRoute(
      path: '/library',
      builder: (context, state) => const DigitalLibraryPage(
        drawer: AdminDrawer(currentRoute: '/library'),
      ),
    ),
    GoRoute(
      path: '/cloud-resources',
      builder: (context, state) => const CloudResourcesPage(
        drawer: AdminDrawer(currentRoute: '/cloud-resources'),
      ),
    ),
    GoRoute(
      path: '/clubs',
      builder: (context, state) => const StudentClubsPage(
        drawer: AdminDrawer(currentRoute: '/clubs'),
      ),
    ),
    GoRoute(
      path: '/demand-forecaster',
      builder: (context, state) => const AdminDemandForecasterPage(),
    ),
    GoRoute(
      path: '/retention-matrix',
      builder: (context, state) => const AdminRetentionMatrixPage(),
    ),
    GoRoute(
      path: '/roles',
      builder: (context, state) => const RolesPermissionsPage(
        drawer: AdminDrawer(currentRoute: '/roles'),
      ),
    ),
    GoRoute(
      path: '/audit-logs',
      builder: (context, state) => const SystemAuditLogsPage(
        drawer: AdminDrawer(currentRoute: '/audit-logs'),
      ),
    ),
    GoRoute(
      path: '/super-admin',
      builder: (context, state) => const AdminSuperControlsPage(),
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
