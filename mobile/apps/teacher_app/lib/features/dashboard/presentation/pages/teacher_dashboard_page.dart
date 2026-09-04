import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

class TeacherDashboardPage extends StatelessWidget {
  const TeacherDashboardPage({super.key});

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
                  // Top Profile & Institution Bar
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          SlAvatar(
                            initials: user?.initials ?? 'T',
                            imageUrl: user?.avatarUrl,
                            size: 46,
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                user?.fullName.isNotEmpty == true ? user!.fullName : 'Faculty Member',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 16,
                                ),
                              ),
                              Row(
                                children: [
                                  const SlBadge(
                                    text: 'FORM TUTOR',
                                    variant: SlBadgeVariant.success,
                                  ),
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
                            side: BorderSide(
                              color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                            ),
                          ),
                        ),
                        onPressed: () {},
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // Today's Focus Bento Banner
                  SlCard(
                    hasGradient: true,
                    borderColor: AppColors.primary.withAlpha(50),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const SlBadge(
                              text: 'NEXT PERIOD • CLASS 1A',
                              variant: SlBadgeVariant.primary,
                            ),
                            Text(
                              '09:30 AM - 10:15 AM',
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
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.3,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Room 204 • 34 Students Enrolled',
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: SlButton(
                                text: 'Take Attendance',
                                height: 44,
                                borderRadius: 14,
                                icon: const Icon(LucideIcons.userCheck, size: 16, color: Colors.white),
                                onPressed: () => context.go('/attendance'),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: SlButton(
                                text: 'Class Details',
                                height: 44,
                                borderRadius: 14,
                                variant: SlButtonVariant.secondary,
                                icon: const Icon(LucideIcons.arrowUpRight, size: 16),
                                onPressed: () => context.go('/grading'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Quick Bento Action Grid
                  const Text(
                    'ACADEMIC MODULES',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.2,
                      color: AppColors.darkTextMuted,
                    ),
                  ),
                  const SizedBox(height: 12),

                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 1.15,
                    children: [
                      _QuickActionTile(
                        title: 'Attendance',
                        subtitle: 'Live Attendance',
                        icon: LucideIcons.calendarCheck,
                        color: AppColors.emerald,
                        onTap: () => context.go('/attendance'),
                      ),
                      _QuickActionTile(
                        title: 'Classroom Grading',
                        subtitle: 'Assessment Records',
                        icon: LucideIcons.fileSpreadsheet,
                        color: AppColors.primary,
                        onTap: () => context.go('/grading'),
                      ),
                      _QuickActionTile(
                        title: 'Homework & Tasks',
                        subtitle: 'Publish & Grade',
                        icon: LucideIcons.bookOpen,
                        color: AppColors.purple,
                        onTap: () => context.go('/homework'),
                      ),
                      _QuickActionTile(
                        title: 'Daily Collections',
                        subtitle: 'Bus & Feeding Bills',
                        icon: LucideIcons.wallet,
                        color: AppColors.amber,
                        onTap: () => context.go('/daily-bills'),
                      ),
                      _QuickActionTile(
                        title: 'Staff Leave',
                        subtitle: 'Absence & Approvals',
                        icon: LucideIcons.calendarX,
                        color: AppColors.rose,
                        onTap: () => context.push('/leave'),
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // Active Classes Overview
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'MY ASSIGNED CLASSES',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.2,
                          color: AppColors.darkTextMuted,
                        ),
                      ),
                      TextButton(
                        onPressed: () => context.go('/grading'),
                        child: const Text('View All', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  _ClassCard(
                    className: 'Class 1A',
                    subject: 'Mathematics',
                    studentsCount: 34,
                    attendanceRate: '97%',
                    onTap: () => context.go('/attendance'),
                  ),
                  const SizedBox(height: 10),
                  _ClassCard(
                    className: 'Class 2B',
                    subject: 'Integrated Science',
                    studentsCount: 28,
                    attendanceRate: '92%',
                    onTap: () => context.go('/attendance'),
                  ),
                ],
              ),
            ),
          ),
          bottomNavigationBar: _TeacherBottomNav(currentIndex: 0),
        );
      },
    );
  }
}

class _QuickActionTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _QuickActionTile({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SlCard(
      onTap: onTap,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withAlpha(25),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: color.withAlpha(50)),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ClassCard extends StatelessWidget {
  final String className;
  final String subject;
  final int studentsCount;
  final String attendanceRate;
  final VoidCallback onTap;

  const _ClassCard({
    required this.className,
    required this.subject,
    required this.studentsCount,
    required this.attendanceRate,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SlCard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
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
                  border: Border.all(color: AppColors.primary.withAlpha(50)),
                ),
                child: Center(
                  child: Text(
                    className.substring(className.length - 2),
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      color: AppColors.primaryLight,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    className,
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                  ),
                  Text(
                    '$subject • $studentsCount Students',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                    ),
                  ),
                ],
              ),
            ],
          ),
          SlBadge(
            text: attendanceRate,
            variant: SlBadgeVariant.success,
            icon: const Icon(LucideIcons.checkCheck, size: 12, color: AppColors.emeraldLight),
          ),
        ],
      ),
    );
  }
}

class _TeacherBottomNav extends StatelessWidget {
  final int currentIndex;

  const _TeacherBottomNav({required this.currentIndex});

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
        selectedIndex: currentIndex,
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
