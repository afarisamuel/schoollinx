import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

class ParentDashboardPage extends StatelessWidget {
  const ParentDashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<GuardianBloc>()..add(LoadGuardianChildrenEvent()),
      child: const _ParentDashboardView(),
    );
  }
}

class _ParentDashboardView extends StatefulWidget {
  const _ParentDashboardView();

  @override
  State<_ParentDashboardView> createState() => _ParentDashboardViewState();
}

class _ParentDashboardViewState extends State<_ParentDashboardView> {
  int _selectedChildIndex = 0;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, authState) {
        final user = authState.user;
        final tenant = authState.tenant;

        return BlocBuilder<GuardianBloc, GuardianState>(
          builder: (context, guardianState) {
            if (guardianState is GuardianLoading) {
              return const Scaffold(
                body: Center(child: CircularProgressIndicator()),
              );
            }

            final children = guardianState is GuardianChildrenLoaded ? guardianState.children : <ChildEntity>[];

            if (children.isEmpty) {
              return Scaffold(
                appBar: AppBar(title: const Text('Parent Portal')),
                body: const Center(
                  child: Text('No ward or child profiles linked to this parent account.'),
                ),
              );
            }

            final activeChild = children[_selectedChildIndex.clamp(0, children.length - 1)];

            return Scaffold(
              body: SafeArea(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Top Parent Header
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              SlAvatar(
                                initials: user?.initials ?? 'P',
                                imageUrl: user?.avatarUrl,
                                size: 46,
                                backgroundColor: AppColors.emerald.withAlpha(35),
                                textColor: AppColors.emeraldLight,
                              ),
                              const SizedBox(width: 12),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    user?.fullName.isNotEmpty == true ? user!.fullName : 'Guardian / Parent',
                                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                                  ),
                                  Row(
                                    children: [
                                      const SlBadge(text: 'PARENT PORTAL', variant: SlBadgeVariant.success),
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
                            icon: const Icon(LucideIcons.refreshCw, size: 20),
                            onPressed: () {
                              context.read<GuardianBloc>().add(LoadGuardianChildrenEvent());
                            },
                          ),
                        ],
                      ),

                      const SizedBox(height: 20),

                      // Child Selector Pills
                      const Text(
                        'SELECT WARD / CHILD PROFILE',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1, color: AppColors.darkTextMuted),
                      ),
                      const SizedBox(height: 8),

                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: List.generate(children.length, (index) {
                            final child = children[index];
                            final isSelected = _selectedChildIndex == index;

                            return Padding(
                              padding: const EdgeInsets.only(right: 10),
                              child: InkWell(
                                onTap: () => setState(() => _selectedChildIndex = index),
                                borderRadius: BorderRadius.circular(16),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? AppColors.emerald.withAlpha(30)
                                        : (isDark ? AppColors.darkBgSecondary : AppColors.lightBgSecondary),
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: isSelected ? AppColors.emerald : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
                                      width: 1.5,
                                    ),
                                  ),
                                  child: Row(
                                    children: [
                                      SlAvatar(
                                        initials: child.firstName.isNotEmpty ? child.firstName[0] : 'C',
                                        size: 28,
                                        backgroundColor: isSelected ? AppColors.emerald : null,
                                        textColor: Colors.white,
                                      ),
                                      const SizedBox(width: 8),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            child.fullName,
                                            style: TextStyle(
                                              fontWeight: FontWeight.w800,
                                              fontSize: 13,
                                              color: isSelected ? AppColors.emeraldLight : null,
                                            ),
                                          ),
                                          Text(
                                            child.className,
                                            style: TextStyle(
                                              fontSize: 10,
                                              color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          }),
                        ),
                      ),

                      const SizedBox(height: 20),

                      // Active Child Bento Focus
                      SlCard(
                        hasGradient: true,
                        borderColor: AppColors.emerald.withAlpha(50),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  activeChild.fullName,
                                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
                                ),
                                SlBadge(
                                  text: activeChild.className,
                                  variant: SlBadgeVariant.primary,
                                ),
                              ],
                            ),
                            const SizedBox(height: 14),

                            Row(
                              children: [
                                Expanded(
                                  child: _ChildMetricBox(
                                    label: 'ATTENDANCE',
                                    value: activeChild.attendancePercent,
                                    color: AppColors.emerald,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                const Expanded(
                                  child: _ChildMetricBox(
                                    label: 'TERM GPA',
                                    value: '3.85 / 4.0',
                                    color: AppColors.primaryLight,
                                  ),
                                ),
                              ],
                            ),

                            const SizedBox(height: 14),

                            // Fee Status Row
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              decoration: BoxDecoration(
                                color: activeChild.outstandingFees > 0 ? AppColors.rose.withAlpha(20) : AppColors.emerald.withAlpha(20),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: activeChild.outstandingFees > 0 ? AppColors.rose.withAlpha(40) : AppColors.emerald.withAlpha(40),
                                ),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'TERM FEE STATUS',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w800,
                                          color: activeChild.outstandingFees > 0 ? AppColors.roseLight : AppColors.emeraldLight,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        activeChild.outstandingFees > 0
                                            ? 'GH₵ ${activeChild.outstandingFees.toStringAsFixed(2)} Outstanding'
                                            : 'Fully Cleared • No Arrears',
                                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                                      ),
                                    ],
                                  ),
                                  if (activeChild.outstandingFees > 0)
                                    FilledButton(
                                      style: FilledButton.styleFrom(
                                        backgroundColor: AppColors.rose,
                                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                      ),
                                      onPressed: () => context.go('/fees'),
                                      child: const Text('Pay Now', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                                    ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 20),

                      // Quick Action Bento Grid
                      const Text(
                        'QUICK PORTAL ACTIONS',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1, color: AppColors.darkTextMuted),
                      ),
                      const SizedBox(height: 10),

                      GridView.count(
                        crossAxisCount: 2,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                        childAspectRatio: 1.35,
                        children: [
                          _ParentActionTile(
                            icon: LucideIcons.creditCard,
                            title: 'Fee Payment',
                            subtitle: 'Family Ledger',
                            color: AppColors.emerald,
                            onTap: () => context.go('/fees'),
                          ),
                          _ParentActionTile(
                            icon: LucideIcons.wallet,
                            title: 'Smart Wallet',
                            subtitle: 'Pocket Money',
                            color: const Color(0xFF6366F1),
                            onTap: () => context.go('/wallet'),
                          ),
                          _ParentActionTile(
                            icon: LucideIcons.bus,
                            title: 'Bus Tracking',
                            subtitle: activeChild.busStatus,
                            color: AppColors.amber,
                            onTap: () => context.go('/bus'),
                          ),
                          _ParentActionTile(
                            icon: LucideIcons.graduationCap,
                            title: 'Academics',
                            subtitle: 'Term Grades',
                            color: AppColors.primary,
                            onTap: () => context.go('/academics'),
                          ),
                          _ParentActionTile(
                            icon: LucideIcons.calendarX2,
                            title: 'Excuse Absence',
                            subtitle: 'Submit Leave',
                            color: AppColors.rose,
                            onTap: () => context.go('/absence'),
                          ),
                          _ParentActionTile(
                            icon: LucideIcons.heartPulse,
                            title: 'Health & Clinic',
                            subtitle: 'Medical Card',
                            color: AppColors.rose,
                            onTap: () => context.push('/health-card', extra: activeChild),
                          ),
                          _ParentActionTile(
                            icon: LucideIcons.users,
                            title: 'PTA Conference',
                            subtitle: 'Book Teacher',
                            color: AppColors.cyan,
                            onTap: () => context.go('/pta'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              bottomNavigationBar: const _ParentBottomNav(currentIndex: 0),
            );
          },
        );
      },
    );
  }
}

class _ChildMetricBox extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _ChildMetricBox({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: color.withAlpha(25),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withAlpha(40)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: color)),
          const SizedBox(height: 2),
          Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: color)),
        ],
      ),
    );
  }
}

class _ParentActionTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _ParentActionTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: SlCard(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withAlpha(25),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, size: 20, color: color),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 10, color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ParentBottomNav extends StatelessWidget {
  final int currentIndex;

  const _ParentBottomNav({required this.currentIndex});

  @override
  Widget build(BuildContext context) {
    return NavigationBar(
      selectedIndex: currentIndex,
      onDestinationSelected: (index) {
        switch (index) {
          case 0:
            context.go('/dashboard');
            break;
          case 1:
            context.go('/fees');
            break;
          case 2:
            context.go('/academics');
            break;
          case 3:
            context.go('/bus');
            break;
          case 4:
            context.go('/profile');
            break;
        }
      },
      destinations: const [
        NavigationDestination(icon: Icon(LucideIcons.home), label: 'Home'),
        NavigationDestination(icon: Icon(LucideIcons.creditCard), label: 'Fees'),
        NavigationDestination(icon: Icon(LucideIcons.graduationCap), label: 'Academics'),
        NavigationDestination(icon: Icon(LucideIcons.bus), label: 'Transit'),
        NavigationDestination(icon: Icon(LucideIcons.user), label: 'Profile'),
      ],
    );
  }
}
