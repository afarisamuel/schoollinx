import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/teacher_drawer.dart';

class TeacherProfilePage extends StatelessWidget {
  const TeacherProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BlocConsumer<AuthBloc, AuthState>(
      listener: (context, state) {
        if (!state.isAuthenticated) {
          context.go('/login');
        }
      },
      builder: (context, state) {
        final user = state.user;
        final tenant = state.tenant;

        return Scaffold(
          drawer: const TeacherDrawer(currentRoute: '/profile'),
          appBar: AppBar(
            title: const Text('Faculty Profile', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
          ),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  // Profile Card
                  SlCard(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      children: [
                        SlAvatar(
                          initials: user?.initials ?? 'T',
                          imageUrl: user?.avatarUrl,
                          size: 72,
                        ),
                        const SizedBox(height: 14),
                        Text(
                          user?.fullName.isNotEmpty == true ? user!.fullName : 'Faculty Member',
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          user?.email ?? '',
                          style: TextStyle(
                            fontSize: 13,
                            color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                          ),
                        ),
                        const SizedBox(height: 12),
                        const SlBadge(text: 'TEACHER / FORM TUTOR', variant: SlBadgeVariant.success),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Institution Details Card
                  SlCard(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'CONNECTED INSTITUTION',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.darkTextMuted, letterSpacing: 1),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: AppColors.primary.withAlpha(30),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: const Center(child: Icon(LucideIcons.school, size: 22, color: AppColors.primaryLight)),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    tenant?.name ?? 'SchoolLinx Academy',
                                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                                  ),
                                  Text(
                                    'Code: ${tenant?.code ?? 'THINKCE'}',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                      color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Actions
                  SlCard(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Column(
                      children: [
                        _ProfileMenuTile(
                          icon: LucideIcons.key,
                          title: 'Change Password',
                          onTap: () {},
                        ),
                        _ProfileMenuTile(
                          icon: LucideIcons.shieldCheck,
                          title: 'Biometric Login',
                          subtitle: 'Face ID / Fingerprint enabled',
                          onTap: () {},
                        ),
                        _ProfileMenuTile(
                          icon: LucideIcons.arrowLeftRight,
                          title: 'Switch School / Institution',
                          onTap: () {
                            context.read<AuthBloc>().add(const ChangeTenantEvent());
                          },
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  SlButton(
                    text: 'Sign Out of Faculty Portal',
                    variant: SlButtonVariant.danger,
                    icon: const Icon(LucideIcons.logOut, size: 18, color: Colors.white),
                    onPressed: () {
                      context.read<AuthBloc>().add(const LogoutRequestedEvent());
                    },
                  ),
                ],
              ),
            ),
          ),
          bottomNavigationBar: const _TeacherProfileBottomNav(),
        );
      },
    );
  }
}

class _ProfileMenuTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;

  const _ProfileMenuTile({
    required this.icon,
    required this.title,
    this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return ListTile(
      onTap: onTap,
      leading: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkBgTertiary : AppColors.lightBgTertiary,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, size: 18, color: AppColors.primaryLight),
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
      subtitle: subtitle != null
          ? Text(
              subtitle!,
              style: TextStyle(
                fontSize: 11,
                color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
              ),
            )
          : null,
      trailing: const Icon(LucideIcons.chevronRight, size: 16, color: AppColors.darkTextMuted),
    );
  }
}

class _TeacherProfileBottomNav extends StatelessWidget {
  const _TeacherProfileBottomNav();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkBgSecondary : AppColors.lightBgSecondary,
        border: Border(
          top: BorderSide(
            color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
          ),
        ),
      ),
      child: NavigationBar(
        selectedIndex: 4,
        backgroundColor: Colors.transparent,
        elevation: 0,
        indicatorColor: AppColors.primary.withAlpha(30),
        destinations: const [
          NavigationDestination(icon: Icon(LucideIcons.home, size: 20), label: 'Home'),
          NavigationDestination(icon: Icon(LucideIcons.calendarCheck, size: 20), label: 'Attendance'),
          NavigationDestination(icon: Icon(LucideIcons.fileSpreadsheet, size: 20), label: 'Grading'),
          NavigationDestination(icon: Icon(LucideIcons.clock, size: 20), label: 'Timetable'),
          NavigationDestination(icon: Icon(LucideIcons.user, size: 20), label: 'Profile'),
        ],
        onDestinationSelected: (index) {
          switch (index) {
            case 0:
              context.go('/dashboard');
              break;
            case 1:
              context.go('/attendance');
              break;
            case 2:
              context.go('/grading');
              break;
            case 3:
              context.go('/timetable');
              break;
            case 4:
              context.go('/profile');
              break;
          }
        },
      ),
    );
  }
}
