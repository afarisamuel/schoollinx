import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

class ParentDrawer extends StatelessWidget {
  final String currentRoute;

  const ParentDrawer({
    super.key,
    this.currentRoute = '/dashboard',
  });

  @override
  Widget build(BuildContext context) {
    return SlAppDrawer(
      appTitle: 'SchoolLinx Parent',
      roleBadgeText: 'PARENT / GUARDIAN',
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
          id: 'parent_overview',
          title: 'PARENT PORTAL',
          accentColor: Color(0xFF6366F1),
          items: [
            SlDrawerItemData(
              icon: LucideIcons.layoutDashboard,
              title: 'Parent Overview',
              route: '/dashboard',
            ),
            SlDrawerItemData(
              icon: LucideIcons.fileText,
              title: 'School Circulars & PTA',
              route: '/pta',
            ),
          ],
        ),
        SlDrawerGroupData(
          id: 'parent_academics',
          title: "CHILD'S LEARNING",
          accentColor: Color(0xFF8B5CF6),
          items: [
            SlDrawerItemData(
              icon: LucideIcons.graduationCap,
              title: 'Academics & Report Cards',
              route: '/academics',
            ),
            SlDrawerItemData(
              icon: LucideIcons.award,
              title: 'Activities, Badges & Points',
              route: '/badges',
            ),
          ],
        ),
        SlDrawerGroupData(
          id: 'parent_finance',
          title: 'FEES & TRANSIT',
          accentColor: Color(0xFF10B981),
          items: [
            SlDrawerItemData(
              icon: LucideIcons.creditCard,
              title: 'School Fees & Statements',
              route: '/fees',
            ),
            SlDrawerItemData(
              icon: LucideIcons.bus,
              title: 'Live Bus GPS Tracker',
              route: '/bus',
            ),
            SlDrawerItemData(
              icon: LucideIcons.shieldCheck,
              title: 'Security Pickup Pass',
              route: '/pickup-pass',
            ),
            SlDrawerItemData(
              icon: LucideIcons.wallet,
              title: 'Student Pocket Wallet',
              route: '/wallet',
            ),
          ],
        ),
        SlDrawerGroupData(
          id: 'parent_care',
          title: 'WELLNESS & CONTACT',
          accentColor: Color(0xFFEC4899),
          items: [
            SlDrawerItemData(
              icon: LucideIcons.messageSquare,
              title: 'Direct Messaging',
              route: '/messaging',
            ),
            SlDrawerItemData(
              icon: LucideIcons.fileText,
              title: 'Leave & Absence Request',
              route: '/absence',
            ),
            SlDrawerItemData(
              icon: LucideIcons.user,
              title: 'Parent Profile & Settings',
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
      '/fees',
      '/bus',
      '/pickup-pass',
      '/academics',
      '/badges',
      '/absence',
      '/wallet',
      '/pta',
      '/messaging',
      '/health-card',
      '/profile',
    };
    if (valid.contains(route)) return route;
    return '/dashboard';
  }
}
