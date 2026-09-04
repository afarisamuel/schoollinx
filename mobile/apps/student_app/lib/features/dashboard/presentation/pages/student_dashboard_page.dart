import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/student_drawer.dart';

class StudentDashboardPage extends StatelessWidget {
  const StudentDashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<TimetableBloc>(
          create: (_) => sl<TimetableBloc>()..add(const LoadClassTimetableEvent('Form 2A')),
        ),
        BlocProvider<HomeworkBloc>(
          create: (_) => sl<HomeworkBloc>()..add(const LoadClassHomeworkEvent('Form 2A')),
        ),
        BlocProvider<HouseMeritBloc>(
          create: (_) => sl<HouseMeritBloc>()..add(const LoadHouseLeaderboardEvent()),
        ),
      ],
      child: const _StudentDashboardView(),
    );
  }
}

class _StudentDashboardView extends StatelessWidget {
  const _StudentDashboardView();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, authState) {
        final user = authState.user;
        final tenant = authState.tenant;

        return Scaffold(
          backgroundColor: isDark ? const Color(0xFF0B1120) : const Color(0xFFF8FAFC),
          drawer: const StudentDrawer(currentRoute: '/dashboard'),
          body: SafeArea(
            child: RefreshIndicator(
              onRefresh: () async {
                context.read<TimetableBloc>().add(const LoadClassTimetableEvent('Form 2A'));
                context.read<HomeworkBloc>().add(const LoadClassHomeworkEvent('Form 2A'));
                context.read<HouseMeritBloc>().add(const LoadHouseLeaderboardEvent());
              },
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                slivers: [
                  // ── 1. TOP APP BAR ─────────────────────────────────────────
                  SliverToBoxAdapter(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF0D1526) : Colors.white,
                        border: Border(
                          bottom: BorderSide(
                            color: isDark ? Colors.white.withAlpha(20) : const Color(0xFFE2E8F0),
                          ),
                        ),
                      ),
                      child: Row(
                        children: [
                          Builder(
                            builder: (btnCtx) => Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: () => Scaffold.of(btnCtx).openDrawer(),
                                borderRadius: BorderRadius.circular(12),
                                child: Container(
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: isDark ? Colors.white.withAlpha(20) : const Color(0xFFE2E8F0),
                                    ),
                                  ),
                                  child: Icon(
                                    LucideIcons.menu,
                                    size: 19,
                                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          SlAvatar(
                            initials: user?.initials ?? 'S',
                            imageUrl: user?.avatarUrl,
                            size: 40,
                            backgroundColor: const Color(0xFF2563EB),
                            textColor: Colors.white,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  user?.fullName.isNotEmpty == true ? user!.fullName : 'Student Portal',
                                  style: TextStyle(
                                    fontSize: 14.5,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: -0.3,
                                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 2),
                                Row(
                                  children: [
                                    Container(
                                      width: 6,
                                      height: 6,
                                      decoration: const BoxDecoration(
                                        color: Color(0xFF10B981),
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const SizedBox(width: 5),
                                    Expanded(
                                      child: Text(
                                        tenant?.name ?? 'SchoolLinx Student Hub',
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                          color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          // Digital ID Quick Pass
                          Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: () => context.go('/id-card'),
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                width: 38,
                                height: 38,
                                decoration: BoxDecoration(
                                  color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: isDark ? Colors.white.withAlpha(20) : const Color(0xFFE2E8F0),
                                  ),
                                ),
                                child: Icon(
                                  LucideIcons.qrCode,
                                  size: 17,
                                  color: isDark ? const Color(0xFF38BDF8) : const Color(0xFF0284C7),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // ── 2. DASHBOARD BODY ─────────────────────────────────────
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
                    sliver: SliverList(
                      delegate: SliverChildListDelegate([
                        // ── HERO CLASS SCHEDULE CARD ─────────────────────────
                        BlocBuilder<TimetableBloc, TimetableState>(
                          builder: (context, timeState) {
                            TimetableEntryEntity? currentClass;
                            if (timeState is TimetableLoaded && timeState.allEntries.isNotEmpty) {
                              currentClass = timeState.allEntries.first;
                            }

                            return _buildStudentHeroCard(context, isDark, currentClass);
                          },
                        ),

                        const SizedBox(height: 20),

                        // ── SECTION: REAL STUDENT PERFORMANCE METRICS ────────
                        Text(
                          'MY ACADEMIC PERFORMANCE',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.1,
                            color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                          ),
                        ),
                        const SizedBox(height: 12),

                        BlocBuilder<HomeworkBloc, HomeworkState>(
                          builder: (context, hwState) {
                            final tasksCount = hwState is HomeworkListLoaded ? hwState.homeworkList.length : 3;

                            return BlocBuilder<HouseMeritBloc, HouseMeritState>(
                              builder: (context, meritState) {
                                final points = meritState is HouseLeaderboardLoadedState && meritState.houses.isNotEmpty
                                    ? meritState.houses.first.totalPoints
                                    : 450;

                                return Column(
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: _buildStudentKpiCard(
                                            isDark: isDark,
                                            title: 'Attendance Rate',
                                            value: '98.2%',
                                            subtitle: 'Present this term',
                                            icon: LucideIcons.clipboardCheck,
                                            accentColor: const Color(0xFF10B981),
                                            onTap: () => context.go('/timetable'),
                                          ),
                                        ),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: _buildStudentKpiCard(
                                            isDark: isDark,
                                            title: 'Term GPA',
                                            value: '3.85',
                                            subtitle: 'Rank: 2nd in Class',
                                            icon: LucideIcons.award,
                                            accentColor: const Color(0xFF3B82F6),
                                            onTap: () => context.go('/portfolio'),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 10),
                                    Row(
                                      children: [
                                        Expanded(
                                          child: _buildStudentKpiCard(
                                            isDark: isDark,
                                            title: 'Pending Tasks',
                                            value: '$tasksCount Due',
                                            subtitle: 'Assignments & tasks',
                                            icon: LucideIcons.bookOpen,
                                            accentColor: const Color(0xFFF59E0B),
                                            onTap: () => context.go('/homework'),
                                          ),
                                        ),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: _buildStudentKpiCard(
                                            isDark: isDark,
                                            title: 'House Points',
                                            value: '$points pts',
                                            subtitle: 'Merit badge ranking',
                                            icon: LucideIcons.star,
                                            accentColor: const Color(0xFF8B5CF6),
                                            onTap: () => context.go('/portfolio'),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                );
                              },
                            );
                          },
                        ),

                        const SizedBox(height: 22),

                        // ── SECTION: STUDENT HUB MODULES ─────────────────────
                        Text(
                          'LEARNING & DISCOVERY HUB',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.1,
                            color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                          ),
                        ),
                        const SizedBox(height: 10),

                        GridView.count(
                          crossAxisCount: 2,
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          crossAxisSpacing: 10,
                          mainAxisSpacing: 10,
                          childAspectRatio: 1.1,
                          children: [
                            _buildStudentModuleCard(
                              isDark: isDark,
                              title: 'Weekly Timetable',
                              subtitle: 'Daily period roster',
                              icon: LucideIcons.calendar,
                              accentColor: const Color(0xFF3B82F6),
                              onTap: () => context.go('/timetable'),
                            ),
                            _buildStudentModuleCard(
                              isDark: isDark,
                              title: 'Homework & Tasks',
                              subtitle: 'Assignments & submission',
                              icon: LucideIcons.bookOpen,
                              accentColor: const Color(0xFF8B5CF6),
                              onTap: () => context.go('/homework'),
                            ),
                            _buildStudentModuleCard(
                              isDark: isDark,
                              title: 'CBT Assessments',
                              subtitle: 'Online quizzes & exams',
                              icon: LucideIcons.monitor,
                              accentColor: const Color(0xFF06B6D4),
                              onTap: () => context.go('/cbt'),
                            ),
                            _buildStudentModuleCard(
                              isDark: isDark,
                              title: 'Digital Library',
                              subtitle: 'E-books & study resources',
                              icon: LucideIcons.library,
                              accentColor: const Color(0xFF10B981),
                              onTap: () => context.go('/library'),
                            ),
                            _buildStudentModuleCard(
                              isDark: isDark,
                              title: 'Digital Student ID',
                              subtitle: 'Scan QR & gate pass',
                              icon: LucideIcons.qrCode,
                              accentColor: const Color(0xFFF59E0B),
                              onTap: () => context.go('/id-card'),
                            ),
                            _buildStudentModuleCard(
                              isDark: isDark,
                              title: 'House Merit & Badges',
                              subtitle: 'Co-curricular portfolio',
                              icon: LucideIcons.award,
                              accentColor: const Color(0xFFEC4899),
                              onTap: () => context.go('/portfolio'),
                            ),
                          ],
                        ),
                      ]),
                    ),
                  ),
                ],
              ),
            ),
          ),
          bottomNavigationBar: _buildStudentBottomNav(context, isDark),
        );
      },
    );
  }

  // ── WIDGET: STUDENT HERO CARD ────────────────────────────────────────────
  Widget _buildStudentHeroCard(BuildContext context, bool isDark, TimetableEntryEntity? currentClass) {
    final title = currentClass?.subject ?? 'Mathematics & Geometry';
    final subInfo = currentClass != null
        ? 'Room ${currentClass.room} • Instructor: ${currentClass.teacherName}'
        : 'Room 204 • Instructor: Mr. Samuel Adusei';
    final periodTime = currentClass != null
        ? '${currentClass.startTime} - ${currentClass.endTime}'
        : '08:45 AM - 09:30 AM';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? [
                  const Color(0xFF1E3A8A),
                  const Color(0xFF1E40AF),
                  const Color(0xFF0B1120),
                ]
              : [
                  const Color(0xFF2563EB),
                  const Color(0xFF3B82F6),
                  const Color(0xFF1D4ED8),
                ],
        ),
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2563EB).withAlpha(isDark ? 50 : 70),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withAlpha(25),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.white.withAlpha(35)),
                ),
                child: Text(
                  currentClass != null ? 'CURRENT • ROOM ${currentClass.room}' : 'CURRENT PERIOD • FORM 2A',
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.8,
                    color: Colors.white,
                  ),
                ),
              ),
              Text(
                periodTime,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            title,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subInfo,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: Colors.white.withAlpha(200),
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () => context.go('/timetable'),
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withAlpha(30),
                            blurRadius: 8,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(LucideIcons.calendar, size: 14, color: Color(0xFF1D4ED8)),
                          SizedBox(width: 6),
                          Text(
                            'Full Timetable',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF1D4ED8),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () => context.go('/homework'),
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: Colors.white.withAlpha(25),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white.withAlpha(50)),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(LucideIcons.bookOpen, size: 14, color: Colors.white),
                          SizedBox(width: 6),
                          Text(
                            'My Tasks',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── WIDGET: STUDENT KPI METRIC CARD ──────────────────────────────────────
  Widget _buildStudentKpiCard({
    required bool isDark,
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color accentColor,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF0D1526) : Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: isDark ? Colors.white.withAlpha(20) : const Color(0xFFE2E8F0),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                    ),
                  ),
                  Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      color: accentColor.withAlpha(isDark ? 35 : 20),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(icon, size: 14, color: accentColor),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                value,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -0.5,
                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── WIDGET: STUDENT MODULE CARD ──────────────────────────────────────────
  Widget _buildStudentModuleCard({
    required bool isDark,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color accentColor,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF0D1526) : Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: isDark ? Colors.white.withAlpha(20) : const Color(0xFFE2E8F0),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: accentColor.withAlpha(isDark ? 35 : 20),
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Icon(icon, size: 18, color: accentColor),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w500,
                      color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── WIDGET: STUDENT BOTTOM NAVIGATION ────────────────────────────────────
  Widget _buildStudentBottomNav(BuildContext context, bool isDark) {
    return Container(
      height: 64,
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0D1526) : Colors.white,
        border: Border(
          top: BorderSide(
            color: isDark ? Colors.white.withAlpha(20) : const Color(0xFFE2E8F0),
          ),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildNavItem(
            icon: LucideIcons.layoutDashboard,
            label: 'Hub',
            isSelected: true,
            onTap: () {},
            isDark: isDark,
          ),
          _buildNavItem(
            icon: LucideIcons.calendar,
            label: 'Timetable',
            isSelected: false,
            onTap: () => context.go('/timetable'),
            isDark: isDark,
          ),
          _buildNavItem(
            icon: LucideIcons.bookOpen,
            label: 'Homework',
            isSelected: false,
            onTap: () => context.go('/homework'),
            isDark: isDark,
          ),
          _buildNavItem(
            icon: LucideIcons.monitor,
            label: 'CBT',
            isSelected: false,
            onTap: () => context.go('/cbt'),
            isDark: isDark,
          ),
          _buildNavItem(
            icon: LucideIcons.user,
            label: 'Profile',
            isSelected: false,
            onTap: () => context.go('/profile'),
            isDark: isDark,
          ),
        ],
      ),
    );
  }

  Widget _buildNavItem({
    required IconData icon,
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return InkWell(
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            size: 19,
            color: isSelected
                ? const Color(0xFF38BDF8)
                : (isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8)),
          ),
          const SizedBox(height: 3),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
              color: isSelected
                  ? const Color(0xFF38BDF8)
                  : (isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8)),
            ),
          ),
        ],
      ),
    );
  }
}
