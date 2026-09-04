import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

class ParentProfilePage extends StatelessWidget {
  const ParentProfilePage({super.key});

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
          appBar: AppBar(
            title: const Text('Parent Settings', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
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
                          initials: user?.initials ?? 'P',
                          imageUrl: user?.avatarUrl,
                          size: 72,
                          backgroundColor: AppColors.emerald.withAlpha(35),
                          textColor: AppColors.emeraldLight,
                        ),
                        const SizedBox(height: 14),
                        Text(
                          user?.fullName.isNotEmpty == true ? user!.fullName : 'Guardian / Parent',
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
                        const SlBadge(text: 'VERIFIED GUARDIAN', variant: SlBadgeVariant.success),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  SlCard(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Column(
                      children: [
                        ListTile(
                          leading: const Icon(LucideIcons.users, color: AppColors.emerald, size: 20),
                          title: const Text('Linked Children', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                          subtitle: const Text('2 Students (Samuel & Ama)', style: TextStyle(fontSize: 11)),
                          trailing: const Icon(LucideIcons.chevronRight, size: 16),
                        ),
                        ListTile(
                          leading: const Icon(LucideIcons.building, color: AppColors.emerald, size: 20),
                          title: const Text('School Information', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                          subtitle: Text(tenant?.name ?? 'ThinkCE School', style: const TextStyle(fontSize: 11)),
                          trailing: const Icon(LucideIcons.chevronRight, size: 16),
                        ),
                        ListTile(
                          leading: const Icon(LucideIcons.arrowLeftRight, color: AppColors.emerald, size: 20),
                          title: const Text('Switch School', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                          trailing: const Icon(LucideIcons.chevronRight, size: 16),
                          onTap: () => context.read<AuthBloc>().add(const ChangeTenantEvent()),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  SlButton(
                    text: 'Sign Out of Parent Portal',
                    variant: SlButtonVariant.danger,
                    icon: const Icon(LucideIcons.logOut, size: 18, color: Colors.white),
                    onPressed: () => context.read<AuthBloc>().add(const LogoutRequestedEvent()),
                  ),
                ],
              ),
            ),
          ),
          bottomNavigationBar: const _ParentProfileBottomNav(),
        );
      },
    );
  }
}

class _ParentProfileBottomNav extends StatelessWidget {
  const _ParentProfileBottomNav();

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
        indicatorColor: AppColors.emerald.withAlpha(30),
        destinations: const [
          NavigationDestination(icon: Icon(LucideIcons.home, size: 20), label: 'Home'),
          NavigationDestination(icon: Icon(LucideIcons.creditCard, size: 20), label: 'Fees'),
          NavigationDestination(icon: Icon(LucideIcons.bus, size: 20), label: 'Bus'),
          NavigationDestination(icon: Icon(LucideIcons.fileText, size: 20), label: 'Reports'),
          NavigationDestination(icon: Icon(LucideIcons.user, size: 20), label: 'Profile'),
        ],
        onDestinationSelected: (index) {
          switch (index) {
            case 0:
              context.go('/dashboard');
              break;
            case 1:
              context.go('/fees');
              break;
            case 2:
              context.go('/bus');
              break;
            case 3:
              context.go('/academics');
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
