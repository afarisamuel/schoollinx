import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

class StudentDrawer extends StatelessWidget {
  final String currentRoute;

  const StudentDrawer({
    super.key,
    this.currentRoute = '/dashboard',
  });

  @override
  Widget build(BuildContext context) {
    return SlAppDrawer(
      appTitle: 'SchoolLinx Student',
      roleBadgeText: 'STUDENT',
      roleBadgeVariant: SlBadgeVariant.primary,
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
          id: 'student_overview',
          title: 'STUDENT PORTAL',
          accentColor: Color(0xFF6366F1),
          items: [
            SlDrawerItemData(
              icon: LucideIcons.layoutDashboard,
              title: 'Dashboard',
              route: '/dashboard',
            ),
          ],
        ),
        SlDrawerGroupData(
          id: 'student_academics',
          title: 'ACADEMICS & STUDY',
          accentColor: Color(0xFF8B5CF6),
          items: [
            SlDrawerItemData(
              icon: LucideIcons.zap,
              title: 'My Learning Path',
              route: '/learning-path',
            ),
            SlDrawerItemData(
              icon: LucideIcons.bookOpen,
              title: 'My Assignments',
              route: '/homework',
            ),
            SlDrawerItemData(
              icon: LucideIcons.calendar,
              title: 'Class Timetable',
              route: '/timetable',
            ),
            SlDrawerItemData(
              icon: LucideIcons.monitor,
              title: 'CBT Online Assessment',
              route: '/cbt',
            ),
            SlDrawerItemData(
              icon: LucideIcons.award,
              title: 'House Points',
              route: '/portfolio',
            ),
          ],
        ),
        SlDrawerGroupData(
          id: 'student_community',
          title: 'COMMUNITY & RESOURCES',
          accentColor: Color(0xFF06B6D4),
          items: [
            SlDrawerItemData(
              icon: LucideIcons.messageSquare,
              title: 'Direct Messages',
              route: '/messaging',
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
              title: 'Clubs & Orgs',
              route: '/clubs',
            ),
            SlDrawerItemData(
              icon: LucideIcons.qrCode,
              title: 'Student Digital ID Card',
              route: '/id-card',
            ),
            SlDrawerItemData(
              icon: LucideIcons.user,
              title: 'My Profile',
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
      '/learning-path',
      '/timetable',
      '/homework',
      '/cbt',
      '/library',
      '/cloud-resources',
      '/clubs',
      '/messaging',
      '/id-card',
      '/portfolio',
      '/profile',
    };
    if (valid.contains(route)) return route;
    return '/dashboard';
  }
}
