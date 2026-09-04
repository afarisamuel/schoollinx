import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/teacher_drawer.dart';

class TeacherDashboardPage extends StatelessWidget {
  const TeacherDashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<TimetableBloc>(
          create: (_) => sl<TimetableBloc>()..add(const LoadTeacherTimetableEvent('teacher-1')),
        ),
        BlocProvider<DailyBillsBloc>(
          create: (_) => sl<DailyBillsBloc>()..add(LoadMyCollectionsEvent()),
        ),
      ],
      child: const _TeacherDashboardView(),
    );
  }
}

class _TeacherDashboardView extends StatelessWidget {
  const _TeacherDashboardView();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, authState) {
        final user = authState.user;
        final tenant = authState.tenant;

        return Scaffold(
          backgroundColor: isDark ? const Color(0xFF0B1120) : const Color(0xFFF8FAFC),
          drawer: const TeacherDrawer(currentRoute: '/dashboard'),
          body: SafeArea(
            child: RefreshIndicator(
              onRefresh: () async {
                context.read<TimetableBloc>().add(const LoadTeacherTimetableEvent('teacher-1'));
                context.read<DailyBillsBloc>().add(LoadMyCollectionsEvent());
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
                            initials: user?.initials ?? 'T',
                            imageUrl: user?.avatarUrl,
                            size: 40,
                            backgroundColor: const Color(0xFF10B981),
                            textColor: Colors.white,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  user?.fullName.isNotEmpty == true ? user!.fullName : 'Faculty Member',
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
                                        tenant?.name ?? 'SchoolLinx Academic Suite',
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
                          // Quick Timetable Action Button
                          Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: () => context.go('/timetable'),
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
                                  LucideIcons.calendar,
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
                        // ── TODAY'S ACTIVE PERIOD FOCUS CARD ─────────────────
                        BlocBuilder<TimetableBloc, TimetableState>(
                          builder: (context, timeState) {
                            TimetableEntryEntity? nextClass;
                            if (timeState is TimetableLoaded && timeState.allEntries.isNotEmpty) {
                              nextClass = timeState.allEntries.first;
                            }

                            return _buildTeacherFocusCard(context, isDark, nextClass);
                          },
                        ),

                        const SizedBox(height: 20),

                        // ── SECTION: CLASSROOM TELEMETRY ─────────────────────
                        Text(
                          'FACULTY PERFORMANCE METRICS',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.1,
                            color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                          ),
                        ),
                        const SizedBox(height: 12),

                        BlocBuilder<DailyBillsBloc, DailyBillsState>(
                          builder: (context, billsState) {
                            final posAmount = billsState is DailyBillsLoaded
                                ? billsState.totalCollectedAmount
                                : 420.0;

                            return BlocBuilder<TimetableBloc, TimetableState>(
                              builder: (context, timeState) {
                                final totalClasses = timeState is TimetableLoaded ? timeState.allEntries.length : 3;

                                return Column(
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: _buildTeacherKpiCard(
                                            isDark: isDark,
                                            title: 'Assigned Classes',
                                            value: '$totalClasses Periods',
                                            subtitle: 'Active course roster',
                                            icon: LucideIcons.calendar,
                                            accentColor: const Color(0xFF3B82F6),
                                            onTap: () => context.go('/timetable'),
                                          ),
                                        ),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: _buildTeacherKpiCard(
                                            isDark: isDark,
                                            title: 'Class Attendance',
                                            value: '96.5%',
                                            subtitle: 'High turnout today',
                                            icon: LucideIcons.clipboardCheck,
                                            accentColor: const Color(0xFF10B981),
                                            onTap: () => context.go('/attendance'),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 10),
                                    Row(
                                      children: [
                                        Expanded(
                                          child: _buildTeacherKpiCard(
                                            isDark: isDark,
                                            title: 'Pending Grading',
                                            value: '14 Tasks',
                                            subtitle: 'Quiz submissions',
                                            icon: LucideIcons.bookOpen,
                                            accentColor: const Color(0xFFF59E0B),
                                            onTap: () => context.go('/homework'),
                                          ),
                                        ),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: _buildTeacherKpiCard(
                                            isDark: isDark,
                                            title: 'POS Collections',
                                            value: 'GH₵ ${posAmount.toStringAsFixed(0)}',
                                            subtitle: 'Daily canteen cashier',
                                            icon: LucideIcons.receipt,
                                            accentColor: const Color(0xFF8B5CF6),
                                            onTap: () => context.go('/daily-bills'),
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

                        // ── SECTION: CLASSROOM ACTIONS ───────────────────────
                        Text(
                          'TEACHING & CLASSROOM SUITE',
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
                            _buildTeacherActionCard(
                              isDark: isDark,
                              title: 'Daily Attendance',
                              subtitle: 'Roll call & registers',
                              icon: LucideIcons.clipboardCheck,
                              accentColor: const Color(0xFF10B981),
                              onTap: () => context.go('/attendance'),
                            ),
                            _buildTeacherActionCard(
                              isDark: isDark,
                              title: 'Class Grading',
                              subtitle: 'Scores & term reports',
                              icon: LucideIcons.checkCircle2,
                              accentColor: const Color(0xFF3B82F6),
                              onTap: () => context.go('/grading'),
                            ),
                            _buildTeacherActionCard(
                              isDark: isDark,
                              title: 'Homework & Tasks',
                              subtitle: 'Assignments & CBT',
                              icon: LucideIcons.bookOpen,
                              accentColor: const Color(0xFF8B5CF6),
                              onTap: () => context.go('/homework'),
                            ),
                            _buildTeacherActionCard(
                              isDark: isDark,
                              title: 'Master Timetable',
                              subtitle: 'Daily period schedule',
                              icon: LucideIcons.calendar,
                              accentColor: const Color(0xFF06B6D4),
                              onTap: () => context.go('/timetable'),
                            ),
                            _buildTeacherActionCard(
                              isDark: isDark,
                              title: 'Daily POS Cashier',
                              subtitle: 'Feeding & canteen billing',
                              icon: LucideIcons.receipt,
                              accentColor: const Color(0xFFF59E0B),
                              onTap: () => context.go('/daily-bills'),
                            ),
                            _buildTeacherActionCard(
                              isDark: isDark,
                              title: 'Staff Leave Portal',
                              subtitle: 'Absence & applications',
                              icon: LucideIcons.briefcase,
                              accentColor: const Color(0xFFEC4899),
                              onTap: () => context.go('/leave'),
                            ),
                          ],
                        ),

                        const SizedBox(height: 22),

                        // ── SECTION: TODAY'S CLASS SCHEDULE PREVIEW ──────────
                        Text(
                          'TODAY\'S CLASS SCHEDULE',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.1,
                            color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                          ),
                        ),
                        const SizedBox(height: 10),

                        BlocBuilder<TimetableBloc, TimetableState>(
                          builder: (context, timeState) {
                            if (timeState is TimetableLoaded && timeState.allEntries.isNotEmpty) {
                              return Column(
                                children: timeState.allEntries.take(4).map((entry) {
                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 6),
                                    child: _buildScheduleItem(
                                      isDark: isDark,
                                      period: '${entry.dayOfWeek} • ${entry.startTime} - ${entry.endTime}',
                                      subject: entry.subject,
                                      className: 'Room ${entry.room}',
                                      isCurrent: false,
                                    ),
                                  );
                                }).toList(),
                              );
                            }

                            return Column(
                              children: [
                                _buildScheduleItem(
                                  isDark: isDark,
                                  period: 'Period 1 • 08:30 - 09:15',
                                  subject: 'Integrated Science',
                                  className: 'Form 2A • Room 104',
                                  isCompleted: true,
                                ),
                                const SizedBox(height: 6),
                                _buildScheduleItem(
                                  isDark: isDark,
                                  period: 'Period 2 • 09:30 - 10:15',
                                  subject: 'Mathematics & Geometry',
                                  className: 'Form 1A • Room 204',
                                  isCurrent: true,
                                ),
                                const SizedBox(height: 6),
                                _buildScheduleItem(
                                  isDark: isDark,
                                  period: 'Period 4 • 11:30 - 12:15',
                                  subject: 'Core Mathematics',
                                  className: 'Form 3C • Room 301',
                                  isUpcoming: true,
                                ),
                              ],
                            );
                          },
                        ),
                      ]),
                    ),
                  ),
                ],
              ),
            ),
          ),
          bottomNavigationBar: _buildTeacherBottomNav(context, isDark),
        );
      },
    );
  }

  // ── WIDGET: TEACHER FOCUS BANNER ─────────────────────────────────────────
  Widget _buildTeacherFocusCard(BuildContext context, bool isDark, TimetableEntryEntity? nextClass) {
    final title = nextClass?.subject ?? 'Mathematics & Geometry';
    final subInfo = nextClass != null
        ? 'Room ${nextClass.room} • Instructor: ${nextClass.teacherName}'
        : 'Room 204 • 34 Students Enrolled';
    final periodTime = nextClass != null
        ? '${nextClass.startTime} - ${nextClass.endTime}'
        : '09:30 AM - 10:15 AM';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? [
                  const Color(0xFF064E3B),
                  const Color(0xFF065F46),
                  const Color(0xFF0B1120),
                ]
              : [
                  const Color(0xFF059669),
                  const Color(0xFF10B981),
                  const Color(0xFF047857),
                ],
        ),
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF10B981).withAlpha(isDark ? 50 : 70),
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
                  nextClass != null ? 'SCHEDULED • ROOM ${nextClass.room}' : 'NEXT PERIOD • FORM 1A',
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
                    onTap: () => context.go('/attendance'),
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
                          Icon(LucideIcons.userCheck, size: 14, color: Color(0xFF047857)),
                          SizedBox(width: 6),
                          Text(
                            'Take Attendance',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF047857),
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
                    onTap: () => context.go('/grading'),
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
                          Icon(LucideIcons.fileCheck, size: 14, color: Colors.white),
                          SizedBox(width: 6),
                          Text(
                            'Gradebook',
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

  // ── WIDGET: TEACHER KPI METRIC CARD ──────────────────────────────────────
  Widget _buildTeacherKpiCard({
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
                  fontSize: 19,
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

  // ── WIDGET: TEACHER ACTION CARD ──────────────────────────────────────────
  Widget _buildTeacherActionCard({
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

  // ── WIDGET: SCHEDULE ITEM PREVIEW ────────────────────────────────────────
  Widget _buildScheduleItem({
    required bool isDark,
    required String period,
    required String subject,
    required String className,
    bool isCompleted = false,
    bool isCurrent = false,
    bool isUpcoming = false,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      decoration: BoxDecoration(
        color: isCurrent
            ? (isDark ? const Color(0xFF10B981).withAlpha(25) : const Color(0xFFECFDF5))
            : (isDark ? const Color(0xFF0D1526) : Colors.white),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isCurrent
              ? const Color(0xFF10B981).withAlpha(80)
              : (isDark ? Colors.white.withAlpha(15) : const Color(0xFFE2E8F0)),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: isCompleted
                  ? const Color(0xFF10B981).withAlpha(20)
                  : (isCurrent
                      ? const Color(0xFF10B981)
                      : (isDark ? Colors.white.withAlpha(15) : const Color(0xFFF1F5F9))),
              borderRadius: BorderRadius.circular(9),
            ),
            child: Icon(
              isCompleted ? LucideIcons.check : LucideIcons.clock,
              size: 15,
              color: isCompleted
                  ? const Color(0xFF10B981)
                  : (isCurrent ? Colors.white : (isDark ? Colors.white : const Color(0xFF64748B))),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  subject,
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                  ),
                ),
                Text(
                  className,
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
          Text(
            period.split('•').first.trim(),
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: isCurrent
                  ? const Color(0xFF10B981)
                  : (isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8)),
            ),
          ),
        ],
      ),
    );
  }

  // ── WIDGET: TEACHER BOTTOM NAVIGATION ────────────────────────────────────
  Widget _buildTeacherBottomNav(BuildContext context, bool isDark) {
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
            label: 'Cockpit',
            isSelected: true,
            onTap: () {},
            isDark: isDark,
          ),
          _buildNavItem(
            icon: LucideIcons.clipboardCheck,
            label: 'Attendance',
            isSelected: false,
            onTap: () => context.go('/attendance'),
            isDark: isDark,
          ),
          _buildNavItem(
            icon: LucideIcons.checkCircle2,
            label: 'Grading',
            isSelected: false,
            onTap: () => context.go('/grading'),
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
                ? const Color(0xFF10B981)
                : (isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8)),
          ),
          const SizedBox(height: 3),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
              color: isSelected
                  ? const Color(0xFF10B981)
                  : (isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8)),
            ),
          ),
        ],
      ),
    );
  }
}
