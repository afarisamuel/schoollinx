import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/student_drawer.dart';

class StudentProfilePage extends StatelessWidget {
  const StudentProfilePage({super.key});

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
          drawer: const StudentDrawer(currentRoute: '/profile'),
          appBar: AppBar(
            title: const Text('My Student Profile', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
          ),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  SlCard(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      children: [
                        SlAvatar(
                          initials: user?.initials ?? 'S',
                          imageUrl: user?.avatarUrl,
                          size: 72,
                        ),
                        const SizedBox(height: 14),
                        Text(
                          user?.fullName.isNotEmpty == true ? user!.fullName : 'Samuel Kofi Adusei',
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Class 2B • STU-2026-003',
                          style: TextStyle(
                            fontSize: 13,
                            color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                          ),
                        ),
                        const SizedBox(height: 12),
                        const SlBadge(text: 'ENROLLED STUDENT', variant: SlBadgeVariant.primary),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  SlCard(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Column(
                      children: [
                        ListTile(
                          leading: const Icon(LucideIcons.school, color: AppColors.primaryLight, size: 20),
                          title: const Text('Institution Name', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                          subtitle: Text(tenant?.name ?? 'ThinkCE School', style: const TextStyle(fontSize: 11)),
                          trailing: const Icon(LucideIcons.chevronRight, size: 16),
                        ),
                        ListTile(
                          leading: const Icon(LucideIcons.user, color: AppColors.primaryLight, size: 20),
                          title: const Text('Form Tutor', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                          subtitle: const Text('Mr. Samuel Adusei', style: TextStyle(fontSize: 11)),
                          trailing: const Icon(LucideIcons.chevronRight, size: 16),
                        ),
                        ListTile(
                          leading: const Icon(LucideIcons.arrowLeftRight, color: AppColors.primaryLight, size: 20),
                          title: const Text('Switch School / Logout', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                          trailing: const Icon(LucideIcons.chevronRight, size: 16),
                          onTap: () => context.read<AuthBloc>().add(const ChangeTenantEvent()),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  SlButton(
                    text: 'Sign Out of Student Hub',
                    variant: SlButtonVariant.danger,
                    icon: const Icon(LucideIcons.logOut, size: 18, color: Colors.white),
                    onPressed: () => context.read<AuthBloc>().add(const LogoutRequestedEvent()),
                  ),
                ],
              ),
            ),
          ),
          bottomNavigationBar: const _StudentProfileBottomNav(),
        );
      },
    );
  }
}

class _StudentProfileBottomNav extends StatelessWidget {
  const _StudentProfileBottomNav();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkBgSecondary : AppColors.lightBgSecondary,
        border: Border(top: BorderSide(color: isDark ? AppColors.darkBorder : AppColors.lightBorder)),
      ),
      child: NavigationBar(
        selectedIndex: 4,
        backgroundColor: Colors.transparent,
        elevation: 0,
        indicatorColor: AppColors.primary.withAlpha(30),
        destinations: const [
          NavigationDestination(icon: Icon(LucideIcons.home, size: 20), label: 'Home'),
          NavigationDestination(icon: Icon(LucideIcons.clock, size: 20), label: 'Schedule'),
          NavigationDestination(icon: Icon(LucideIcons.bookOpen, size: 20), label: 'Homework'),
          NavigationDestination(icon: Icon(LucideIcons.badgePercent, size: 20), label: 'ID Card'),
          NavigationDestination(icon: Icon(LucideIcons.user, size: 20), label: 'Profile'),
        ],
        onDestinationSelected: (index) {
          switch (index) {
            case 0:
              context.go('/dashboard');
              break;
            case 1:
              context.go('/timetable');
              break;
            case 2:
              context.go('/homework');
              break;
            case 3:
              context.go('/id-card');
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
