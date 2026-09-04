import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

class StudentDashboardPage extends StatelessWidget {
  const StudentDashboardPage({super.key});

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
                  // Top Profile Bar
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          SlAvatar(
                            initials: user?.initials ?? 'S',
                            imageUrl: user?.avatarUrl,
                            size: 46,
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                user?.fullName.isNotEmpty == true ? user!.fullName : 'Samuel Kofi Adusei',
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                              ),
                              Row(
                                children: [
                                  const SlBadge(text: 'CLASS 2B', variant: SlBadgeVariant.primary),
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
                        icon: const Icon(LucideIcons.qrCode, size: 20, color: AppColors.primaryLight),
                        tooltip: 'Digital ID Card',
                        onPressed: () => context.go('/id-card'),
                      ),
                    ],
                  ),

                  const SizedBox(height: 20),

                  // Next Class Bento Card
                  SlCard(
                    hasGradient: true,
                    borderColor: AppColors.primary.withAlpha(50),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const SlBadge(text: 'CURRENT PERIOD', variant: SlBadgeVariant.success),
                            Text(
                              '08:45 AM - 09:30 AM',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'Mathematics & Geometry',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Room 204 • Tutor: Mr. Samuel Adusei',
                          style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                        ),
                        const SizedBox(height: 16),
                        SlButton(
                          text: 'View Full Timetable',
                          height: 42,
                          borderRadius: 12,
                          variant: SlButtonVariant.secondary,
                          icon: const Icon(LucideIcons.calendar, size: 16),
                          onPressed: () => context.go('/timetable'),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Student Metrics Grid
                  Row(
                    children: [
                      const Expanded(
                        child: _StudentStatCard(
                          label: 'ATTENDANCE',
                          value: '98%',
                          subtitle: 'Present 34/35 Days',
                          color: AppColors.emerald,
                        ),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: _StudentStatCard(
                          label: 'TERM GPA',
                          value: '3.85',
                          subtitle: 'Rank: 2nd / 34',
                          color: AppColors.primaryLight,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // Quick Academic Features Grid
                  const Text(
                    'STUDENT HUB',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.2, color: AppColors.darkTextMuted),
                  ),
                  const SizedBox(height: 12),

                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 1.25,
                    children: [
                      SlCard(
                        onTap: () => context.go('/homework'),
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(color: AppColors.primary.withAlpha(25), borderRadius: BorderRadius.circular(10)),
                              child: const Icon(LucideIcons.bookOpen, color: AppColors.primaryLight, size: 20),
                            ),
                            const Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Homework', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                                SizedBox(height: 2),
                                Text('2 Due this week', style: TextStyle(fontSize: 11, color: AppColors.darkTextMuted)),
                              ],
                            ),
                          ],
                        ),
                      ),
                      SlCard(
                        onTap: () => context.go('/cbt'),
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(color: AppColors.purple.withAlpha(25), borderRadius: BorderRadius.circular(10)),
                              child: const Icon(LucideIcons.laptop, color: AppColors.purple, size: 20),
                            ),
                            const Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('CBT Quizzes', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                                SizedBox(height: 2),
                                Text('Take Online Exams', style: TextStyle(fontSize: 11, color: AppColors.darkTextMuted)),
                              ],
                            ),
                          ],
                        ),
                      ),
                      SlCard(
                        onTap: () => context.go('/library'),
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(color: AppColors.amber.withAlpha(25), borderRadius: BorderRadius.circular(10)),
                              child: const Icon(LucideIcons.library, color: AppColors.amber, size: 20),
                            ),
                            const Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('E-Library', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                                SizedBox(height: 2),
                                Text('Borrow Books', style: TextStyle(fontSize: 11, color: AppColors.darkTextMuted)),
                              ],
                            ),
                          ],
                        ),
                      ),
                      SlCard(
                        onTap: () => context.go('/timetable'),
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(color: AppColors.emerald.withAlpha(25), borderRadius: BorderRadius.circular(10)),
                              child: const Icon(LucideIcons.clock, color: AppColors.emerald, size: 20),
                            ),
                            const Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Class Schedule', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                                SizedBox(height: 2),
                                Text('Full Timetable', style: TextStyle(fontSize: 11, color: AppColors.darkTextMuted)),
                              ],
                            ),
                          ],
                        ),
                      ),
                      SlCard(
                        onTap: () => context.push('/portfolio'),
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(color: AppColors.rose.withAlpha(25), borderRadius: BorderRadius.circular(10)),
                              child: const Icon(LucideIcons.award, color: AppColors.roseLight, size: 20),
                            ),
                            const Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('House & Badges', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                                SizedBox(height: 2),
                                Text('Merits & Portfolio', style: TextStyle(fontSize: 11, color: AppColors.darkTextMuted)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // Upcoming Homework & Tasks Section
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'PENDING HOMEWORK (2)',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.2, color: AppColors.darkTextMuted),
                      ),
                      TextButton(
                        onPressed: () => context.go('/homework'),
                        child: const Text('View All', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  _HomeworkCard(
                    subject: 'Mathematics',
                    title: 'Quadratic Equations Exercise 4.2',
                    dueDate: 'Tomorrow, 08:00 AM',
                    isUrgent: true,
                    onTap: () => context.go('/homework'),
                  ),
                  const SizedBox(height: 10),
                  _HomeworkCard(
                    subject: 'Integrated Science',
                    title: 'Photosynthesis Lab Report',
                    dueDate: 'Friday, 11:59 PM',
                    isUrgent: false,
                    onTap: () => context.go('/homework'),
                  ),

                  const SizedBox(height: 24),

                  // Digital ID Card Quick Launcher
                  SlCard(
                    onTap: () => context.go('/id-card'),
                    padding: const EdgeInsets.all(16),
                    borderColor: AppColors.primary.withAlpha(40),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: AppColors.primary.withAlpha(25),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: const Icon(LucideIcons.badgePercent, color: AppColors.primaryLight, size: 22),
                            ),
                            const SizedBox(width: 14),
                            const Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Digital Student ID', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                                Text('Show QR code at campus gates & library', style: TextStyle(fontSize: 11, color: AppColors.darkTextMuted)),
                              ],
                            ),
                          ],
                        ),
                        const Icon(LucideIcons.chevronRight, size: 16, color: AppColors.darkTextMuted),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          bottomNavigationBar: const _StudentBottomNav(currentIndex: 0),
        );
      },
    );
  }
}

class _StudentStatCard extends StatelessWidget {
  final String label;
  final String value;
  final String subtitle;
  final Color color;

  const _StudentStatCard({
    required this.label,
    required this.value,
    required this.subtitle,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return SlCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: color, letterSpacing: 0.5)),
          const SizedBox(height: 6),
          Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
          const SizedBox(height: 2),
          Text(subtitle, style: const TextStyle(fontSize: 10, color: AppColors.darkTextMuted, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class _HomeworkCard extends StatelessWidget {
  final String subject;
  final String title;
  final String dueDate;
  final bool isUrgent;
  final VoidCallback onTap;

  const _HomeworkCard({
    required this.subject,
    required this.title,
    required this.dueDate,
    required this.isUrgent,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return SlCard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(subject, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.primaryLight)),
              const SizedBox(height: 2),
              Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
              const SizedBox(height: 2),
              Text(
                'Due: $dueDate',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: isUrgent ? AppColors.roseLight : AppColors.darkTextMuted,
                ),
              ),
            ],
          ),
          SlBadge(
            text: isUrgent ? 'DUE SOON' : 'PENDING',
            variant: isUrgent ? SlBadgeVariant.danger : SlBadgeVariant.warning,
          ),
        ],
      ),
    );
  }
}

class _StudentBottomNav extends StatelessWidget {
  final int currentIndex;

  const _StudentBottomNav({required this.currentIndex});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkBgSecondary : AppColors.lightBgSecondary,
        border: Border(top: BorderSide(color: isDark ? AppColors.darkBorder : AppColors.lightBorder)),
      ),
      child: NavigationBar(
        selectedIndex: currentIndex,
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
