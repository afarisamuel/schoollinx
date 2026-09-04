import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/parent_drawer.dart';

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
              return Scaffold(
                backgroundColor: isDark ? const Color(0xFF0B1120) : const Color(0xFFF8FAFC),
                body: const Center(child: CircularProgressIndicator()),
              );
            }

            final children = guardianState is GuardianChildrenLoaded
                ? guardianState.children
                : <ChildEntity>[
                    const ChildEntity(
                      id: 'demo-1',
                      firstName: 'Kofi',
                      lastName: 'Mensah',
                      enrollmentNum: 'STU-2026-084',
                      className: 'Form 2A (Science & ICT)',
                      attendancePercent: '98.2%',
                      outstandingFees: 450.0,
                    ),
                    const ChildEntity(
                      id: 'demo-2',
                      firstName: 'Ama',
                      lastName: 'Mensah',
                      enrollmentNum: 'STU-2026-119',
                      className: 'Form 1B (General Arts)',
                      attendancePercent: '94.0%',
                      outstandingFees: 0.0,
                    ),
                  ];

            final activeChild = children.isNotEmpty
                ? children[_selectedChildIndex.clamp(0, children.length - 1)]
                : const ChildEntity(
                    id: 'default',
                    firstName: 'Ward',
                    lastName: 'Student',
                    enrollmentNum: 'STU-001',
                    className: 'Form 1',
                    attendancePercent: '95.0%',
                    outstandingFees: 0.0,
                  );

            return Scaffold(
              backgroundColor: isDark ? const Color(0xFF0B1120) : const Color(0xFFF8FAFC),
              drawer: const ParentDrawer(currentRoute: '/dashboard'),
              body: SafeArea(
                child: CustomScrollView(
                  physics: const BouncingScrollPhysics(),
                  slivers: [
                    // ── 1. TOP APP BAR ───────────────────────────────────────
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
                              initials: user?.initials ?? 'P',
                              imageUrl: user?.avatarUrl,
                              size: 40,
                              backgroundColor: const Color(0xFF6366F1),
                              textColor: Colors.white,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    user?.fullName.isNotEmpty == true ? user!.fullName : 'Parent / Guardian',
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
                                          tenant?.name ?? 'SchoolLinx Parent Portal',
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
                            // Quick Notifications Shortcut Button
                            Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: () => context.go('/pta'),
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
                                    LucideIcons.bell,
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
                          // ── WARD SELECTOR PILLS ────────────────────────────
                          if (children.isNotEmpty) ...[
                            Text(
                              'SELECT WARD / STUDENT PROFILE',
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 1.1,
                                color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                              ),
                            ),
                            const SizedBox(height: 8),
                            SingleChildScrollView(
                              scrollDirection: Axis.horizontal,
                              physics: const BouncingScrollPhysics(),
                              child: Row(
                                children: List.generate(children.length, (idx) {
                                  final child = children[idx];
                                  final isSel = _selectedChildIndex == idx;

                                  return Padding(
                                    padding: const EdgeInsets.only(right: 8),
                                    child: Material(
                                      color: Colors.transparent,
                                      child: InkWell(
                                        onTap: () => setState(() => _selectedChildIndex = idx),
                                        borderRadius: BorderRadius.circular(14),
                                        child: AnimatedContainer(
                                          duration: const Duration(milliseconds: 150),
                                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                          decoration: BoxDecoration(
                                            color: isSel
                                                ? const Color(0xFF6366F1).withAlpha(isDark ? 50 : 25)
                                                : (isDark ? const Color(0xFF0D1526) : Colors.white),
                                            borderRadius: BorderRadius.circular(14),
                                            border: Border.all(
                                              color: isSel
                                                  ? const Color(0xFF6366F1)
                                                  : (isDark ? Colors.white.withAlpha(20) : const Color(0xFFE2E8F0)),
                                              width: isSel ? 1.5 : 1,
                                            ),
                                          ),
                                          child: Row(
                                            children: [
                                              SlAvatar(
                                                initials: child.firstName.isNotEmpty ? child.firstName[0] : 'W',
                                                size: 26,
                                                backgroundColor: isSel ? const Color(0xFF6366F1) : null,
                                                textColor: Colors.white,
                                              ),
                                              const SizedBox(width: 8),
                                              Text(
                                                '${child.firstName} ${child.lastName}',
                                                style: TextStyle(
                                                  fontSize: 12,
                                                  fontWeight: isSel ? FontWeight.w900 : FontWeight.w600,
                                                  color: isSel
                                                      ? const Color(0xFF818CF8)
                                                      : (isDark ? Colors.white : const Color(0xFF0F172A)),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                  );
                                }),
                              ),
                            ),
                            const SizedBox(height: 16),
                          ],

                          // ── WARD HERO CARD ─────────────────────────────────
                          _buildWardHeroCard(context, isDark, activeChild),

                          const SizedBox(height: 20),

                          // ── SECTION: WARD PERFORMANCE METRICS ──────────────
                          Text(
                            'ACADEMIC & ATTENDANCE METRICS',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 1.1,
                              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                            ),
                          ),
                          const SizedBox(height: 12),

                          Row(
                            children: [
                              Expanded(
                                child: _buildParentKpiCard(
                                  isDark: isDark,
                                  title: 'Attendance Rate',
                                  value: activeChild.attendancePercent,
                                  subtitle: 'Present this term',
                                  icon: LucideIcons.calendarCheck,
                                  accentColor: const Color(0xFF10B981),
                                  onTap: () => context.go('/academics'),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: _buildParentKpiCard(
                                  isDark: isDark,
                                  title: 'Term Outstanding Fees',
                                  value: activeChild.outstandingFees > 0
                                      ? 'GH₵ ${activeChild.outstandingFees.toStringAsFixed(0)}'
                                      : 'Fully Cleared',
                                  subtitle: activeChild.outstandingFees > 0 ? 'Paystack Ready' : 'Receipts on file',
                                  icon: LucideIcons.creditCard,
                                  accentColor: activeChild.outstandingFees > 0
                                      ? const Color(0xFFEF4444)
                                      : const Color(0xFF10B981),
                                  onTap: () => context.go('/fees'),
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 22),

                          // ── SECTION: PARENT MODULES & SERVICES ─────────────
                          Text(
                            'PARENT PORTAL SERVICES',
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
                              _buildParentServiceCard(
                                isDark: isDark,
                                title: 'Fee Payments',
                                subtitle: 'Paystack & statements',
                                icon: LucideIcons.creditCard,
                                accentColor: const Color(0xFF10B981),
                                onTap: () => context.go('/fees'),
                              ),
                              _buildParentServiceCard(
                                isDark: isDark,
                                title: 'Live Bus Tracker',
                                subtitle: 'Route & GPS tracking',
                                icon: LucideIcons.bus,
                                accentColor: const Color(0xFF06B6D4),
                                onTap: () => context.go('/bus'),
                              ),
                              _buildParentServiceCard(
                                isDark: isDark,
                                title: 'Academic Reports',
                                subtitle: 'Grades & assignments',
                                icon: LucideIcons.graduationCap,
                                accentColor: const Color(0xFF8B5CF6),
                                onTap: () => context.go('/academics'),
                              ),
                              _buildParentServiceCard(
                                isDark: isDark,
                                title: 'Absence Notes',
                                subtitle: 'Leave permission slips',
                                icon: LucideIcons.fileText,
                                accentColor: const Color(0xFFF59E0B),
                                onTap: () => context.go('/absence'),
                              ),
                              _buildParentServiceCard(
                                isDark: isDark,
                                title: 'Pocket Wallet',
                                subtitle: 'Canteen allowance POS',
                                icon: LucideIcons.wallet,
                                accentColor: const Color(0xFFEC4899),
                                onTap: () => context.go('/wallet'),
                              ),
                              _buildParentServiceCard(
                                isDark: isDark,
                                title: 'PTA & Notices',
                                subtitle: 'Circulars & chat',
                                icon: LucideIcons.users,
                                accentColor: const Color(0xFF6366F1),
                                onTap: () => context.go('/pta'),
                              ),
                            ],
                          ),
                        ]),
                      ),
                    ),
                  ],
                ),
              ),
              bottomNavigationBar: _buildParentBottomNav(context, isDark),
            );
          },
        );
      },
    );
  }

  // ── WIDGET: WARD HERO CARD ───────────────────────────────────────────────
  Widget _buildWardHeroCard(BuildContext context, bool isDark, ChildEntity child) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? [
                  const Color(0xFF312E81),
                  const Color(0xFF1E1B4B),
                  const Color(0xFF0B1120),
                ]
              : [
                  const Color(0xFF4F46E5),
                  const Color(0xFF6366F1),
                  const Color(0xFF4338CA),
                ],
        ),
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF6366F1).withAlpha(isDark ? 50 : 70),
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
                  child.enrollmentNum,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.8,
                    color: Colors.white,
                  ),
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
                  'ENROLLED',
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
            '${child.firstName} ${child.lastName}',
            style: const TextStyle(
              fontSize: 21,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            child.className,
            style: TextStyle(
              fontSize: 12.5,
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
                    onTap: () => context.go('/fees'),
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
                          Icon(LucideIcons.creditCard, size: 14, color: Color(0xFF4338CA)),
                          SizedBox(width: 6),
                          Text(
                            'Pay School Fees',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF4338CA),
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
                    onTap: () => context.go('/bus'),
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
                          Icon(LucideIcons.bus, size: 14, color: Colors.white),
                          SizedBox(width: 6),
                          Text(
                            'Live Bus GPS',
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

  // ── WIDGET: PARENT KPI CARD ──────────────────────────────────────────────
  Widget _buildParentKpiCard({
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

  // ── WIDGET: PARENT SERVICE CARD ──────────────────────────────────────────
  Widget _buildParentServiceCard({
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

  // ── WIDGET: PARENT BOTTOM NAVIGATION ─────────────────────────────────────
  Widget _buildParentBottomNav(BuildContext context, bool isDark) {
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
            label: 'Overview',
            isSelected: true,
            onTap: () {},
            isDark: isDark,
          ),
          _buildNavItem(
            icon: LucideIcons.creditCard,
            label: 'Fees',
            isSelected: false,
            onTap: () => context.go('/fees'),
            isDark: isDark,
          ),
          _buildNavItem(
            icon: LucideIcons.bus,
            label: 'Bus',
            isSelected: false,
            onTap: () => context.go('/bus'),
            isDark: isDark,
          ),
          _buildNavItem(
            icon: LucideIcons.graduationCap,
            label: 'Academics',
            isSelected: false,
            onTap: () => context.go('/academics'),
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
                ? const Color(0xFF6366F1)
                : (isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8)),
          ),
          const SizedBox(height: 3),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
              color: isSelected
                  ? const Color(0xFF6366F1)
                  : (isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8)),
            ),
          ),
        ],
      ),
    );
  }
}
