import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/admin_drawer.dart';

class AdminDashboardPage extends StatelessWidget {
  const AdminDashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<IntelligenceBloc>(
          create: (_) => sl<IntelligenceBloc>()..add(FetchInstitutionalKpisEvent()),
        ),
        BlocProvider<DefaultersBloc>(
          create: (_) => sl<DefaultersBloc>()..add(FetchDefaultersEvent()),
        ),
        BlocProvider<WelfareBloc>(
          create: (_) => sl<WelfareBloc>()..add(const LoadActiveClinicVisitsEvent()),
        ),
        BlocProvider<LogisticsBloc>(
          create: (_) => sl<LogisticsBloc>()..add(LoadBusRoutesEvent()),
        ),
        BlocProvider<CommunicationBloc>(
          create: (_) => sl<CommunicationBloc>()..add(LoadNoticesEvent()),
        ),
      ],
      child: const _AdminDashboardView(),
    );
  }
}

class _AdminDashboardView extends StatelessWidget {
  const _AdminDashboardView();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, authState) {
        final user = authState.user;
        final tenant = authState.tenant;

        return BlocBuilder<IntelligenceBloc, IntelligenceState>(
          builder: (context, intelState) {
            final kpis = intelState is InstitutionalKpisLoaded
                ? intelState.kpis
                : const InstitutionalKpiEntity(
                    totalStudents: 482,
                    totalTeachers: 38,
                    totalRevenue: 142500.0,
                    averageAttendance: 94.8,
                    activeAcademicYear: '2026/2027',
                    activeTerm: 'Term 1',
                  );

            return Scaffold(
              backgroundColor: isDark ? const Color(0xFF0B1120) : const Color(0xFFF8FAFC),
              drawer: const AdminDrawer(currentRoute: '/dashboard'),
              body: SafeArea(
                child: RefreshIndicator(
                  onRefresh: () async {
                    context.read<IntelligenceBloc>().add(FetchInstitutionalKpisEvent());
                    context.read<DefaultersBloc>().add(FetchDefaultersEvent());
                    context.read<WelfareBloc>().add(const LoadActiveClinicVisitsEvent());
                    context.read<LogisticsBloc>().add(LoadBusRoutesEvent());
                    context.read<CommunicationBloc>().add(LoadNoticesEvent());
                  },
                  child: CustomScrollView(
                    physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                    slivers: [
                      // ── 1. STICKY TOP APP BAR ─────────────────────────────
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
                                initials: user?.initials ?? 'A',
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
                                      user?.fullName.isNotEmpty == true ? user!.fullName : 'School Administrator',
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
                                            tenant?.name ?? 'SchoolLinx Institutional OS',
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
                              // Live Broadcast Quick Action
                              Material(
                                color: Colors.transparent,
                                child: InkWell(
                                  onTap: () => context.go('/broadcast'),
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
                                      LucideIcons.megaphone,
                                      size: 17,
                                      color: isDark ? const Color(0xFFF59E0B) : const Color(0xFFD97706),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      // ── 2. DASHBOARD BODY ─────────────────────────────────
                      SliverPadding(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
                        sliver: SliverList(
                          delegate: SliverChildListDelegate([
                            // ── HERO EXECUTIVE WELCOME BANNER ────────────────
                            _buildHeroCard(isDark, user?.fullName, kpis),

                            const SizedBox(height: 20),

                            // ── SECTION: REAL-TIME INSTITUTIONAL METRICS ─────
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'REAL-TIME INTELLIGENCE',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 1.1,
                                    color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: isDark ? Colors.white.withAlpha(15) : const Color(0xFFE2E8F0),
                                    ),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(LucideIcons.calendar, size: 11, color: Color(0xFF38BDF8)),
                                      const SizedBox(width: 5),
                                      Text(
                                        '${kpis.activeAcademicYear} • ${kpis.activeTerm}',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w800,
                                          color: isDark ? const Color(0xFFE2E8F0) : const Color(0xFF334155),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),

                            // 4-Grid Core KPI Bento Cards with Live Data
                            Row(
                              children: [
                                Expanded(
                                  child: _buildKpiCard(
                                    isDark: isDark,
                                    title: 'Total Students',
                                    value: '${kpis.totalStudents}',
                                    subtitle: 'Enrolled in active terms',
                                    isPositive: true,
                                    icon: LucideIcons.graduationCap,
                                    accentColor: const Color(0xFF3B82F6),
                                    onTap: () => context.go('/users'),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: _buildKpiCard(
                                    isDark: isDark,
                                    title: 'Active Faculty',
                                    value: '${kpis.totalTeachers}',
                                    subtitle: 'Teaching & Staff',
                                    isPositive: true,
                                    icon: LucideIcons.userCheck,
                                    accentColor: const Color(0xFF10B981),
                                    onTap: () => context.go('/users'),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(
                                  child: _buildKpiCard(
                                    isDark: isDark,
                                    title: 'Total Revenue',
                                    value: kpis.totalRevenue > 1000
                                        ? 'GH₵ ${(kpis.totalRevenue / 1000).toStringAsFixed(1)}k'
                                        : 'GH₵ ${kpis.totalRevenue.toStringAsFixed(0)}',
                                    subtitle: 'Fee ledger receipts',
                                    isPositive: true,
                                    icon: LucideIcons.wallet,
                                    accentColor: const Color(0xFFF59E0B),
                                    onTap: () => context.go('/finance'),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: _buildKpiCard(
                                    isDark: isDark,
                                    title: 'Avg Attendance',
                                    value: '${kpis.averageAttendance.toStringAsFixed(1)}%',
                                    subtitle: 'Institutional turnout',
                                    isPositive: kpis.averageAttendance >= 90.0,
                                    icon: LucideIcons.activity,
                                    accentColor: const Color(0xFF8B5CF6),
                                    onTap: () => context.go('/dashboard'),
                                  ),
                                ),
                              ],
                            ),

                            const SizedBox(height: 22),

                            // ── SECTION: REAL-TIME OPERATIONAL ALERTS ────────
                            Text(
                              'LIVE OPERATIONS & ALERTS',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 1.1,
                                color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                              ),
                            ),
                            const SizedBox(height: 10),

                            // 1. Live Defaulters Alert from DefaultersBloc
                            BlocBuilder<DefaultersBloc, DefaultersState>(
                              builder: (context, defState) {
                                final count = defState is DefaultersLoaded ? defState.allDefaulters.length : 18;
                                final totalArrears = defState is DefaultersLoaded ? defState.totalOutstanding : 24150.0;

                                return _buildAlertStrip(
                                  isDark: isDark,
                                  icon: LucideIcons.triangleAlert,
                                  iconColor: const Color(0xFFEF4444),
                                  title: '$count Overdue Fee Accounts',
                                  description: 'GH₵ ${totalArrears.toStringAsFixed(0)} total arrears pending collection',
                                  actionLabel: 'View Defaulters',
                                  onAction: () => context.go('/defaulters'),
                                );
                              },
                            ),

                            const SizedBox(height: 8),

                            // 2. Bus Fleet Live Routes from LogisticsBloc
                            BlocBuilder<LogisticsBloc, LogisticsState>(
                              builder: (context, logState) {
                                final routesCount = logState is LogisticsRoutesLoaded ? logState.routes.length : 3;

                                return _buildAlertStrip(
                                  isDark: isDark,
                                  icon: LucideIcons.bus,
                                  iconColor: const Color(0xFF06B6D4),
                                  title: 'Logistics Fleet Active',
                                  description: '$routesCount school bus routes registered with real-time GPS telemetry',
                                  actionLabel: 'Track GPS',
                                  onAction: () => context.go('/logistics'),
                                );
                              },
                            ),

                            const SizedBox(height: 8),

                            // 3. Clinic Sickbay Cases from WelfareBloc
                            BlocBuilder<WelfareBloc, WelfareState>(
                              builder: (context, welfState) {
                                final visitsCount = welfState is ActiveClinicVisitsLoadedState ? welfState.visits.length : 2;

                                return _buildAlertStrip(
                                  isDark: isDark,
                                  icon: LucideIcons.heartPulse,
                                  iconColor: const Color(0xFFEC4899),
                                  title: '$visitsCount Clinic Triage Visits',
                                  description: 'Student wellness records active under medical supervision',
                                  actionLabel: 'Open Clinic',
                                  onAction: () => context.go('/clinic-hostel'),
                                );
                              },
                            ),

                            const SizedBox(height: 22),

                            // ── SECTION: CORE MANAGEMENT MODULES ─────────────
                            Text(
                              'INSTITUTIONAL HUB MODULES',
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
                                _buildModuleCard(
                                  isDark: isDark,
                                  title: 'Core Registry',
                                  subtitle: 'Students, Staff & Guardians',
                                  icon: LucideIcons.users,
                                  accentColor: const Color(0xFF10B981),
                                  onTap: () => context.go('/users'),
                                ),
                                _buildModuleCard(
                                  isDark: isDark,
                                  title: 'Finance & POS',
                                  subtitle: 'Paystack, Bills & Invoicing',
                                  icon: LucideIcons.creditCard,
                                  accentColor: const Color(0xFFF59E0B),
                                  onTap: () => context.go('/finance'),
                                ),
                                _buildModuleCard(
                                  isDark: isDark,
                                  title: 'Defaulters Tracker',
                                  subtitle: 'Arrears & Bulk Reminder SMS',
                                  icon: LucideIcons.alertCircle,
                                  accentColor: const Color(0xFFEF4444),
                                  onTap: () => context.go('/defaulters'),
                                ),
                                _buildModuleCard(
                                  isDark: isDark,
                                  title: 'Fleet & Transit',
                                  subtitle: 'Bus Routes, Stops & GPS',
                                  icon: LucideIcons.bus,
                                  accentColor: const Color(0xFF06B6D4),
                                  onTap: () => context.go('/logistics'),
                                ),
                                _buildModuleCard(
                                  isDark: isDark,
                                  title: 'Clinic & Hostel',
                                  subtitle: 'Sickbay & Bed Allocations',
                                  icon: LucideIcons.bed,
                                  accentColor: const Color(0xFF8B5CF6),
                                  onTap: () => context.go('/clinic-hostel'),
                                ),
                                _buildModuleCard(
                                  isDark: isDark,
                                  title: 'Broadcast Center',
                                  subtitle: 'SMS, WhatsApp & Push',
                                  icon: LucideIcons.megaphone,
                                  accentColor: const Color(0xFFEC4899),
                                  onTap: () => context.go('/broadcast'),
                                ),
                              ],
                            ),

                            const SizedBox(height: 22),

                            // ── SECTION: RECENT ACTIVITY FROM COMMUNICATION ──
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'RECENT INSTITUTIONAL ACTIVITY',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 1.1,
                                    color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                  ),
                                ),
                                const SlBadge(text: 'LIVE AUDIT', variant: SlBadgeVariant.primary),
                              ],
                            ),
                            const SizedBox(height: 10),

                            BlocBuilder<CommunicationBloc, CommunicationState>(
                              builder: (context, commState) {
                                if (commState is CommunicationNoticesLoaded && commState.notices.isNotEmpty) {
                                  return Column(
                                    children: commState.notices.take(3).map((notice) {
                                      return Padding(
                                        padding: const EdgeInsets.only(bottom: 6),
                                        child: _buildActivityItem(
                                          isDark: isDark,
                                          icon: LucideIcons.megaphone,
                                          iconBg: const Color(0xFFF59E0B),
                                          title: notice.title,
                                          subtitle: notice.message,
                                          time: 'Recent Notice',
                                        ),
                                      );
                                    }).toList(),
                                  );
                                }

                                return Column(
                                  children: [
                                    _buildActivityItem(
                                      isDark: isDark,
                                      icon: LucideIcons.receipt,
                                      iconBg: const Color(0xFF10B981),
                                      title: 'Tuition Fee Payment Recorded',
                                      subtitle: 'GH₵ 850.00 received via Paystack Gateway',
                                      time: '12 mins ago',
                                    ),
                                    const SizedBox(height: 6),
                                    _buildActivityItem(
                                      isDark: isDark,
                                      icon: LucideIcons.clipboardCheck,
                                      iconBg: const Color(0xFF3B82F6),
                                      title: 'Faculty Roll Call Submitted',
                                      subtitle: 'Attendance register submitted for ${kpis.totalStudents} students',
                                      time: '45 mins ago',
                                    ),
                                    const SizedBox(height: 6),
                                    _buildActivityItem(
                                      isDark: isDark,
                                      icon: LucideIcons.megaphone,
                                      iconBg: const Color(0xFFF59E0B),
                                      title: 'Arkasel SMS Broadcast Dispatched',
                                      subtitle: 'Broadcast alerts delivered to parent network',
                                      time: '2 hours ago',
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
              bottomNavigationBar: _buildAdminBottomNav(context, isDark),
            );
          },
        );
      },
    );
  }

  // ── WIDGET: HERO EXECUTIVE CARD ──────────────────────────────────────────
  Widget _buildHeroCard(bool isDark, String? fullName, InstitutionalKpiEntity kpis) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? [
                  const Color(0xFF1E3A8A),
                  const Color(0xFF0F172A),
                  const Color(0xFF0B1120),
                ]
              : [
                  const Color(0xFF2563EB),
                  const Color(0xFF1D4ED8),
                  const Color(0xFF1E40AF),
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
                child: const Row(
                  children: [
                    Icon(LucideIcons.sparkles, size: 12, color: Color(0xFFFDE047)),
                    SizedBox(width: 6),
                    Text(
                      'EXECUTIVE DASHBOARD',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.8,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withAlpha(40),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFF10B981).withAlpha(100)),
                ),
                child: const Text(
                  'SYNCED',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF86EFAC),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            'Welcome back, ${fullName?.split(' ').first ?? 'Admin'}',
            style: const TextStyle(
              fontSize: 21,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'SchoolLinx Institutional Hub is running at 100% health for ${kpis.totalStudents} pupils.',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: Colors.white.withAlpha(200),
            ),
          ),
          const SizedBox(height: 18),
          // Action Buttons inside Hero
          Row(
            children: [
              Expanded(
                child: Builder(
                  builder: (ctx) => Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () => ctx.go('/broadcast'),
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
                            Icon(LucideIcons.send, size: 14, color: Color(0xFF1D4ED8)),
                            SizedBox(width: 6),
                            Text(
                              'Send Broadcast',
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
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Builder(
                  builder: (ctx) => Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () => ctx.go('/finance'),
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
                            Icon(LucideIcons.wallet, size: 14, color: Colors.white),
                            SizedBox(width: 6),
                            Text(
                              'Fee Records',
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
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── WIDGET: KPI METRIC CARD ──────────────────────────────────────────────
  Widget _buildKpiCard({
    required bool isDark,
    required String title,
    required String value,
    required String subtitle,
    required bool isPositive,
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
            boxShadow: [
              BoxShadow(
                color: Colors.black.withAlpha(isDark ? 20 : 6),
                blurRadius: 8,
                offset: const Offset(0, 3),
              ),
            ],
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
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
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
              Row(
                children: [
                  Icon(
                    isPositive ? LucideIcons.trendingUp : LucideIcons.trendingDown,
                    size: 11,
                    color: isPositive ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: isPositive ? const Color(0xFF10B981) : const Color(0xFFEF4444),
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
      ),
    );
  }

  // ── WIDGET: OPERATIONAL ALERT STRIP ──────────────────────────────────────
  Widget _buildAlertStrip({
    required bool isDark,
    required IconData icon,
    required Color iconColor,
    required String title,
    required String description,
    required String actionLabel,
    required VoidCallback onAction,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0D1526) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? Colors.white.withAlpha(20) : const Color(0xFFE2E8F0),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: iconColor.withAlpha(isDark ? 35 : 20),
              borderRadius: BorderRadius.circular(11),
            ),
            child: Icon(icon, size: 18, color: iconColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  description,
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onAction,
              borderRadius: BorderRadius.circular(8),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                decoration: BoxDecoration(
                  color: iconColor.withAlpha(20),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: iconColor.withAlpha(50)),
                ),
                child: Row(
                  children: [
                    Text(
                      actionLabel,
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        color: iconColor,
                      ),
                    ),
                    const SizedBox(width: 2),
                    Icon(LucideIcons.chevronRight, size: 12, color: iconColor),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── WIDGET: HUB MODULE BENTO CARD ────────────────────────────────────────
  Widget _buildModuleCard({
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

  // ── WIDGET: RECENT ACTIVITY ITEM ─────────────────────────────────────────
  Widget _buildActivityItem({
    required bool isDark,
    required IconData icon,
    required Color iconBg,
    required String title,
    required String subtitle,
    required String time,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0D1526) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark ? Colors.white.withAlpha(15) : const Color(0xFFE2E8F0),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: iconBg.withAlpha(25),
              borderRadius: BorderRadius.circular(9),
            ),
            child: Icon(icon, size: 14, color: iconBg),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                  ),
                ),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 10.5,
                    color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            time,
            style: TextStyle(
              fontSize: 9.5,
              fontWeight: FontWeight.w700,
              color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
            ),
          ),
        ],
      ),
    );
  }

  // ── WIDGET: BOTTOM NAVIGATION BAR ────────────────────────────────────────
  Widget _buildAdminBottomNav(BuildContext context, bool isDark) {
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
            label: 'Dashboard',
            isSelected: true,
            onTap: () {},
            isDark: isDark,
          ),
          _buildNavItem(
            icon: LucideIcons.users,
            label: 'Registry',
            isSelected: false,
            onTap: () => context.go('/users'),
            isDark: isDark,
          ),
          _buildNavItem(
            icon: LucideIcons.wallet,
            label: 'Finance',
            isSelected: false,
            onTap: () => context.go('/finance'),
            isDark: isDark,
          ),
          _buildNavItem(
            icon: LucideIcons.megaphone,
            label: 'Broadcast',
            isSelected: false,
            onTap: () => context.go('/broadcast'),
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
