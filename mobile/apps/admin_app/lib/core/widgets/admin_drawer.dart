import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

class AdminDrawer extends StatelessWidget {
  final String currentRoute;

  const AdminDrawer({
    super.key,
    this.currentRoute = '/dashboard',
  });

  @override
  Widget build(BuildContext context) {
    return SlAppDrawer(
      appTitle: 'SchoolLinx Admin',
      roleBadgeText: 'ADMINISTRATOR',
      roleBadgeVariant: SlBadgeVariant.warning,
      currentRoute: currentRoute,
      onNavigate: (route) {
        final target = _resolveRoute(route);
        context.go(target);
      },
      onLogout: () {
        context.read<AuthBloc>().add(const LogoutRequestedEvent());
        context.go('/tenant-select');
      },
      groups: const [
        SlDrawerGroupData(
          id: 'overview',
          title: 'OVERVIEW',
          accentColor: Color(0xFF6366F1),
          items: [
            SlDrawerItemData(
              icon: LucideIcons.layoutDashboard,
              title: 'Dashboard',
              route: '/dashboard',
            ),
            SlDrawerItemData(
              icon: LucideIcons.bell,
              title: 'Notifications & Broadcasts',
              route: '/broadcast',
            ),
            SlDrawerItemData(
              icon: LucideIcons.chartBar,
              title: 'Executive Analytics',
              route: '/demand-forecaster',
            ),
          ],
        ),
        SlDrawerGroupData(
          id: 'academic',
          title: 'ACADEMIC HUB',
          hubRoute: '/academic-hub',
          accentColor: Color(0xFF8B5CF6),
          items: [
            SlDrawerItemData(
              icon: LucideIcons.layoutGrid,
              title: 'Academic Hub Portal',
              route: '/academic-hub',
            ),
            SlDrawerItemData(
              icon: LucideIcons.school,
              title: 'Classes & Streams',
              route: '/academic-hub',
            ),
            SlDrawerItemData(
              icon: LucideIcons.bookCopy,
              title: 'Course Catalog',
              route: '/academic-hub',
            ),
            SlDrawerItemData(
              icon: LucideIcons.fileCheck,
              title: 'Exam Management',
              route: '/academic-hub',
            ),
          ],
        ),
        SlDrawerGroupData(
          id: 'registry',
          title: 'CORE REGISTRY',
          accentColor: Color(0xFF10B981),
          items: [
            SlDrawerItemData(
              icon: LucideIcons.users,
              title: 'Students Directory',
              route: '/users',
            ),
            SlDrawerItemData(
              icon: LucideIcons.userPlus,
              title: 'Student Enrollment',
              route: '/enrollment',
            ),
            SlDrawerItemData(
              icon: LucideIcons.trendingUp,
              title: 'Promotion Manager',
              route: '/promotions',
            ),
            SlDrawerItemData(
              icon: LucideIcons.contact,
              title: 'Faculty & Staff',
              route: '/staff',
            ),
            SlDrawerItemData(
              icon: LucideIcons.usersRound,
              title: 'Guardians Directory',
              route: '/guardians',
            ),
            SlDrawerItemData(
              icon: LucideIcons.heartPulse,
              title: 'Student Welfare & Clinic',
              route: '/clinic-hostel',
            ),
          ],
        ),
        SlDrawerGroupData(
          id: 'finance',
          title: 'FINANCE & BILLING',
          accentColor: Color(0xFFF59E0B),
          items: [
            SlDrawerItemData(
              icon: LucideIcons.landmark,
              title: 'Financial Ledger',
              route: '/finance',
            ),
            SlDrawerItemData(
              icon: LucideIcons.alertCircle,
              title: 'Fee Defaulters Tracker',
              route: '/defaulters',
            ),
            SlDrawerItemData(
              icon: LucideIcons.receipt,
              title: 'Fee Structures & Bills',
              route: '/fee-structures',
            ),
            SlDrawerItemData(
              icon: LucideIcons.wallet,
              title: 'Digital Wallet & POS',
              route: '/pos',
            ),
            SlDrawerItemData(
              icon: LucideIcons.pieChart,
              title: 'Budget Planning',
              route: '/budget-planning',
            ),
            SlDrawerItemData(
              icon: LucideIcons.fileSpreadsheet,
              title: 'Expense Claims',
              route: '/expenses',
            ),
            SlDrawerItemData(
              icon: LucideIcons.award,
              title: 'Scholarships & Waivers',
              route: '/scholarships',
            ),
            SlDrawerItemData(
              icon: LucideIcons.creditCard,
              title: 'Subscription Billing',
              route: '/subscriptions',
            ),
          ],
        ),
        SlDrawerGroupData(
          id: 'operations',
          title: 'CAMPUS OPERATIONS',
          hubRoute: '/logistics',
          accentColor: Color(0xFFEF4444),
          items: [
            SlDrawerItemData(
              icon: LucideIcons.truck,
              title: 'Logistics & Fleet',
              route: '/logistics',
            ),
            SlDrawerItemData(
              icon: LucideIcons.fingerprint,
              title: 'Biometric Command',
              route: '/biometrics',
            ),
            SlDrawerItemData(
              icon: LucideIcons.building2,
              title: 'Campus Facilities',
              route: '/facilities',
            ),
            SlDrawerItemData(
              icon: LucideIcons.boxes,
              title: 'Asset Management',
              route: '/assets',
            ),
            SlDrawerItemData(
              icon: LucideIcons.briefcase,
              title: 'HR & Staff Policies',
              route: '/hr-policies',
            ),
            SlDrawerItemData(
              icon: LucideIcons.network,
              title: 'Department Units',
              route: '/departments',
            ),
          ],
        ),
        SlDrawerGroupData(
          id: 'connectivity',
          title: 'CONNECTIVITY & LIBRARY',
          hubRoute: '/broadcast',
          accentColor: Color(0xFF06B6D4),
          items: [
            SlDrawerItemData(
              icon: LucideIcons.messageSquare,
              title: 'Communications & SMS',
              route: '/broadcast',
            ),
            SlDrawerItemData(
              icon: LucideIcons.messageCircle,
              title: 'Messaging Center',
              route: '/messaging',
            ),
            SlDrawerItemData(
              icon: LucideIcons.mail,
              title: 'Parent Newsletters',
              route: '/newsletters',
            ),
            SlDrawerItemData(
              icon: LucideIcons.library,
              title: 'Digital Library',
              route: '/library',
            ),
            SlDrawerItemData(
              icon: LucideIcons.cloud,
              title: 'Cloud Resources',
              route: '/cloud-resources',
            ),
            SlDrawerItemData(
              icon: LucideIcons.smile,
              title: 'Student Clubs & Orgs',
              route: '/clubs',
            ),
          ],
        ),
        SlDrawerGroupData(
          id: 'settings',
          title: 'SYSTEM & SETTINGS',
          hubRoute: '/super-admin',
          accentColor: Color(0xFF64748B),
          items: [
            SlDrawerItemData(
              icon: LucideIcons.shieldCheck,
              title: 'Role & Permissions (RBAC)',
              route: '/roles',
            ),
            SlDrawerItemData(
              icon: LucideIcons.fileText,
              title: 'System Audit Logs',
              route: '/audit-logs',
            ),
            SlDrawerItemData(
              icon: LucideIcons.lineChart,
              title: 'Course Demand Forecaster',
              route: '/demand-forecaster',
            ),
            SlDrawerItemData(
              icon: LucideIcons.triangleAlert,
              title: 'Retention Risk Matrix',
              route: '/retention-matrix',
            ),
            SlDrawerItemData(
              icon: LucideIcons.crown,
              title: 'Super Admin Controls',
              route: '/super-admin',
            ),
            SlDrawerItemData(
              icon: LucideIcons.user,
              title: 'My Profile & Security',
              route: '/profile',
            ),
          ],
        ),
      ],
    );
  }

  static String _resolveRoute(String route) {
    const valid = {
      '/dashboard',
      '/academic-hub',
      '/users',
      '/enrollment',
      '/promotions',
      '/staff',
      '/guardians',
      '/finance',
      '/fee-structures',
      '/pos',
      '/budget-planning',
      '/expenses',
      '/scholarships',
      '/subscriptions',
      '/defaulters',
      '/logistics',
      '/biometrics',
      '/facilities',
      '/assets',
      '/hr-policies',
      '/departments',
      '/broadcast',
      '/messaging',
      '/newsletters',
      '/library',
      '/cloud-resources',
      '/clubs',
      '/demand-forecaster',
      '/retention-matrix',
      '/roles',
      '/audit-logs',
      '/super-admin',
      '/clinic-hostel',
      '/profile',
    };
    if (valid.contains(route)) return route;
    return '/dashboard';
  }
}
