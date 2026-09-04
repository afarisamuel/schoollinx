import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

class AdminProfilePage extends StatelessWidget {
  const AdminProfilePage({super.key});

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
            title: const Text('Admin Settings', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
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
                          initials: user?.initials ?? 'A',
                          imageUrl: user?.avatarUrl,
                          size: 72,
                          backgroundColor: AppColors.amber.withAlpha(35),
                          textColor: AppColors.amber,
                        ),
                        const SizedBox(height: 14),
                        Text(
                          user?.fullName.isNotEmpty == true ? user!.fullName : 'School Administrator',
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
                        const SlBadge(text: 'FULL INSTITUTION ACCESS', variant: SlBadgeVariant.warning),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  SlCard(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Column(
                      children: [
                        ListTile(
                          leading: const Icon(LucideIcons.building, color: AppColors.amber, size: 20),
                          title: const Text('School Information', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                          subtitle: Text(tenant?.name ?? 'ThinkCE School', style: const TextStyle(fontSize: 11)),
                          trailing: const Icon(LucideIcons.chevronRight, size: 16),
                        ),
                        ListTile(
                          leading: const Icon(LucideIcons.creditCard, color: AppColors.amber, size: 20),
                          title: const Text('Paystack Gateway Settings', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                          subtitle: const Text('Configured & Active', style: TextStyle(fontSize: 11, color: AppColors.emeraldLight)),
                          trailing: const Icon(LucideIcons.chevronRight, size: 16),
                        ),
                        ListTile(
                          leading: const Icon(LucideIcons.arrowLeftRight, color: AppColors.amber, size: 20),
                          title: const Text('Switch Institution', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                          trailing: const Icon(LucideIcons.chevronRight, size: 16),
                          onTap: () => context.read<AuthBloc>().add(const ChangeTenantEvent()),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  SlButton(
                    text: 'Sign Out of Admin Console',
                    variant: SlButtonVariant.danger,
                    icon: const Icon(LucideIcons.logOut, size: 18, color: Colors.white),
                    onPressed: () => context.read<AuthBloc>().add(const LogoutRequestedEvent()),
                  ),
                ],
              ),
            ),
          ),
          bottomNavigationBar: const _AdminProfileBottomNav(),
        );
      },
    );
  }
}

class _AdminProfileBottomNav extends StatelessWidget {
  const _AdminProfileBottomNav();

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
        indicatorColor: AppColors.amber.withAlpha(30),
        destinations: const [
          NavigationDestination(icon: Icon(LucideIcons.home, size: 20), label: 'Dashboard'),
          NavigationDestination(icon: Icon(LucideIcons.users, size: 20), label: 'Directory'),
          NavigationDestination(icon: Icon(LucideIcons.wallet, size: 20), label: 'Finance'),
          NavigationDestination(icon: Icon(LucideIcons.megaphone, size: 20), label: 'Broadcast'),
          NavigationDestination(icon: Icon(LucideIcons.user, size: 20), label: 'Settings'),
        ],
        onDestinationSelected: (index) {
          switch (index) {
            case 0:
              context.go('/dashboard');
              break;
            case 1:
              context.go('/users');
              break;
            case 2:
              context.go('/finance');
              break;
            case 3:
              context.go('/broadcast');
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
