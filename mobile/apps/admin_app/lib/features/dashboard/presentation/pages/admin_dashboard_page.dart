import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

class AdminDashboardPage extends StatelessWidget {
  const AdminDashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        final user = state.user;
        final tenant = state.tenant;

        return Scaffold(
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top Bar
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          SlAvatar(
                            initials: user?.initials ?? 'A',
                            imageUrl: user?.avatarUrl,
                            size: 46,
                            backgroundColor: AppColors.amber.withAlpha(35),
                            textColor: AppColors.amber,
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                user?.fullName.isNotEmpty == true ? user!.fullName : 'School Administrator',
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                              ),
                              Row(
                                children: [
                                  const SlBadge(text: 'ADMINISTRATOR', variant: SlBadgeVariant.warning),
                                  if (tenant != null) ...[
                                    const SizedBox(width: 6),
                                    Text(
                                      '• ${tenant.name}',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                      IconButton(
                        icon: const Icon(LucideIcons.bell, size: 20),
                        style: IconButton.styleFrom(
                          backgroundColor: isDark ? AppColors.darkBgSecondary : AppColors.lightBgSecondary,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                            side: BorderSide(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                          ),
                        ),
                        onPressed: () {},
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // Institutional KPI Grid
                  const Text(
                    'INSTITUTIONAL METRICS',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.2, color: AppColors.darkTextMuted),
                  ),
                  const SizedBox(height: 12),

                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 1.3,
                    children: [
                      _AdminMetricCard(
                        title: 'Total Students',
                        value: '482',
                        subtitle: '+12 this term',
                        icon: LucideIcons.graduationCap,
                        color: AppColors.primary,
                      ),
                      _AdminMetricCard(
                        title: 'Active Faculty',
                        value: '38',
                        subtitle: '100% attendance',
                        icon: LucideIcons.users,
                        color: AppColors.emerald,
                      ),
                      _AdminMetricCard(
                        title: 'Fee Collection',
                        value: 'GH₵ 142k',
                        subtitle: '84% Collected',
                        icon: LucideIcons.wallet,
                        color: AppColors.amber,
                        onTap: () => context.go('/finance'),
                      ),
                      _AdminMetricCard(
                        title: 'Attendance Rate',
                        value: '94.8%',
                        subtitle: 'High turnout today',
                        icon: LucideIcons.activity,
                        color: AppColors.purple,
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // Emergency Broadcast / Alert Banner
                  SlCard(
                    borderColor: AppColors.rose.withAlpha(60),
                    backgroundColor: AppColors.rose.withAlpha(15),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: AppColors.rose.withAlpha(30),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(LucideIcons.megaphone, color: AppColors.roseLight, size: 20),
                            ),
                            const SizedBox(width: 14),
                            const Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Instant Broadcast', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                                Text('Send SMS & In-app alerts to parents', style: TextStyle(fontSize: 11, color: AppColors.darkTextMuted)),
                              ],
                            ),
                          ],
                        ),
                        IconButton(
                          icon: const Icon(LucideIcons.arrowRight, size: 18, color: AppColors.roseLight),
                          onPressed: () => context.go('/broadcast'),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Operations & Hub Modules
                  const Text(
                    'MANAGEMENT MODULES',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.2, color: AppColors.darkTextMuted),
                  ),
                  const SizedBox(height: 12),

                  _AdminModuleTile(
                    title: 'Student & Faculty Directory',
                    subtitle: 'Manage enrollments, staff assignments & profiles',
                    icon: LucideIcons.userCheck,
                    onTap: () => context.go('/users'),
                  ),
                  const SizedBox(height: 10),
                  _AdminModuleTile(
                    title: 'Fiscal & Fee Management',
                    subtitle: 'Payment records, Paystack collections, revenue',
                    icon: LucideIcons.dollarSign,
                    onTap: () => context.go('/finance'),
                  ),
                  const SizedBox(height: 10),
                  _AdminModuleTile(
                    title: 'Fee Defaulters & SMS Alerts',
                    subtitle: 'Overdue accounts tracker & automated reminder alerts',
                    icon: LucideIcons.alertCircle,
                    onTap: () => context.go('/defaulters'),
                  ),
                  const SizedBox(height: 10),
                  _AdminModuleTile(
                    title: 'Fleet & Logistics Tracking',
                    subtitle: 'Bus transit routes, live GPS telemetry & stops',
                    icon: LucideIcons.bus,
                    onTap: () => context.go('/logistics'),
                  ),
                  const SizedBox(height: 10),
                  _AdminModuleTile(
                    title: 'Clinic & Boarding Logistics',
                    subtitle: 'Hostel room allocations, sickbay visits & prescriptions',
                    icon: LucideIcons.bed,
                    onTap: () => context.go('/clinic-hostel'),
                  ),
                  const SizedBox(height: 10),
                  _AdminModuleTile(
                    title: 'Communications Hub',
                    subtitle: 'Multi-channel SMS blasts, WhatsApp & push notices',
                    icon: LucideIcons.messageSquare,
                    onTap: () => context.go('/broadcast'),
                  ),
                ],
              ),
            ),
          ),
          bottomNavigationBar: const _AdminBottomNav(currentIndex: 0),
        );
      },
    );
  }
}

class _AdminMetricCard extends StatelessWidget {
  final String title;
  final String value;
  final String subtitle;
  final IconData icon;
  final Color color;
  final VoidCallback? onTap;

  const _AdminMetricCard({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.icon,
    required this.color,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return SlCard(
      onTap: onTap,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.darkTextMuted),
              ),
              Icon(icon, size: 16, color: color),
            ],
          ),
          Text(
            value,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
          ),
          Text(
            subtitle,
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: color),
          ),
        ],
      ),
    );
  }
}

class _AdminModuleTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;

  const _AdminModuleTile({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SlCard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.primary.withAlpha(25),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: AppColors.primaryLight, size: 20),
              ),
              const SizedBox(width: 14),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const Icon(LucideIcons.chevronRight, size: 16, color: AppColors.darkTextMuted),
        ],
      ),
    );
  }
}

class _AdminBottomNav extends StatelessWidget {
  final int currentIndex;

  const _AdminBottomNav({required this.currentIndex});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkBgSecondary : AppColors.lightBgSecondary,
        border: Border(
          top: BorderSide(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
        ),
      ),
      child: NavigationBar(
        selectedIndex: currentIndex,
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
