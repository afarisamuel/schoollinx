import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

class TeacherDrawer extends StatelessWidget {
  final String currentRoute;

  const TeacherDrawer({
    super.key,
    this.currentRoute = '/dashboard',
  });

  @override
  Widget build(BuildContext context) {
    return SlAppDrawer(
      appTitle: 'SchoolLinx Teacher',
      roleBadgeText: 'FACULTY MEMBER',
      roleBadgeVariant: SlBadgeVariant.success,
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
          id: 'teacher_overview',
          title: 'TEACHER OVERVIEW',
          accentColor: Color(0xFF6366F1),
          items: [
            SlDrawerItemData(
              icon: LucideIcons.layoutDashboard,
              title: 'Dashboard',
              route: '/dashboard',
            ),
            SlDrawerItemData(
              icon: LucideIcons.fileText,
              title: 'Staff Room Notices',
              route: '/staff-notices',
            ),
            SlDrawerItemData(
              icon: LucideIcons.bot,
              title: 'AI Teaching Copilot',
              route: '/ai-copilot',
            ),
          ],
        ),
        SlDrawerGroupData(
          id: 'teacher_classroom',
          title: 'CLASSROOM & ACADEMICS',
          accentColor: Color(0xFF8B5CF6),
          items: [
            SlDrawerItemData(
              icon: LucideIcons.clipboardCheck,
              title: 'Daily Attendance',
              route: '/attendance',
            ),
            SlDrawerItemData(
              icon: LucideIcons.layoutGrid,
              title: 'Class Seating Charts',
              route: '/seating-charts',
            ),
            SlDrawerItemData(
              icon: LucideIcons.checkCircle2,
              title: 'Classroom Grading',
              route: '/grading',
            ),
            SlDrawerItemData(
              icon: LucideIcons.fileQuestion,
              title: 'CBT Assessment Builder',
              route: '/cbt-builder',
            ),
            SlDrawerItemData(
              icon: LucideIcons.award,
              title: 'Student Conduct & Merits',
              route: '/conduct-merits',
            ),
            SlDrawerItemData(
              icon: LucideIcons.bookOpen,
              title: 'Homework Portal',
              route: '/homework',
            ),
            SlDrawerItemData(
              icon: LucideIcons.fileEdit,
              title: 'Lesson Planner',
              route: '/lesson-planner',
            ),
            SlDrawerItemData(
              icon: LucideIcons.calendar,
              title: 'Teacher Timetable',
              route: '/timetable',
            ),
            SlDrawerItemData(
              icon: LucideIcons.calendarClock,
              title: 'Cover Board & Relief',
              route: '/cover-board',
            ),
            SlDrawerItemData(
              icon: LucideIcons.receipt,
              title: 'Daily Fee Collection',
              route: '/daily-bills',
            ),
          ],
        ),
        SlDrawerGroupData(
          id: 'teacher_care',
          title: 'STUDENT CARE & WELFARE',
          accentColor: Color(0xFF10B981),
          items: [
            SlDrawerItemData(
              icon: LucideIcons.stethoscope,
              title: 'Sickbay Referral',
              route: '/sickbay-referral',
            ),
            SlDrawerItemData(
              icon: LucideIcons.users,
              title: 'Parent Consultations',
              route: '/parent-consultations',
            ),
          ],
        ),
        SlDrawerGroupData(
          id: 'teacher_tools',
          title: 'INSTRUCTION & HR',
          accentColor: Color(0xFF06B6D4),
          items: [
            SlDrawerItemData(
              icon: LucideIcons.briefcase,
              title: 'HR Vault & Payslips',
              route: '/payslips',
            ),
            SlDrawerItemData(
              icon: LucideIcons.fileText,
              title: 'Staff Leave Application',
              route: '/leave',
            ),
            SlDrawerItemData(
              icon: LucideIcons.messageSquare,
              title: 'Messaging Center',
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
              icon: LucideIcons.user,
              title: 'Teacher Profile',
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
      '/attendance',
      '/seating-charts',
      '/sickbay-referral',
      '/parent-consultations',
      '/grading',
      '/cbt-builder',
      '/conduct-merits',
      '/timetable',
      '/cover-board',
      '/homework',
      '/lesson-planner',
      '/daily-bills',
      '/leave',
      '/payslips',
      '/staff-notices',
      '/ai-copilot',
      '/messaging',
      '/library',
      '/cloud-resources',
      '/clubs',
      '/profile',
    };
    if (valid.contains(route)) return route;
    return '/dashboard';
  }
}
