import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

class StudentIdCardPage extends StatelessWidget {
  const StudentIdCardPage({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        final user = state.user;
        final tenant = state.tenant;

        return Scaffold(
          appBar: AppBar(
            title: const Text('Digital Student ID', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
          ),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  // ID Card Container
                  Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [Color(0xFF1E3A8A), Color(0xFF0F172A)],
                      ),
                      borderRadius: BorderRadius.circular(28),
                      border: Border.all(color: AppColors.primaryLight.withAlpha(80), width: 1.5),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withAlpha(60),
                          blurRadius: 24,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Card Header
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Container(
                                  width: 36,
                                  height: 36,
                                  decoration: BoxDecoration(
                                    color: Colors.white.withAlpha(20),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Center(
                                    child: Icon(LucideIcons.graduationCap, color: Colors.white, size: 20),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      tenant?.name.toUpperCase() ?? 'THINKCE SCHOOL',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w900,
                                        fontSize: 12,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                    const Text(
                                      'STUDENT IDENTITY PASS',
                                      style: TextStyle(
                                        color: AppColors.emeraldLight,
                                        fontWeight: FontWeight.w800,
                                        fontSize: 9,
                                        letterSpacing: 1,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            const SlBadge(text: 'ACTIVE 2026/2027', variant: SlBadgeVariant.success),
                          ],
                        ),

                        const SizedBox(height: 24),

                        // Avatar & Details
                        Row(
                          children: [
                            SlAvatar(
                              initials: user?.initials ?? 'S',
                              imageUrl: user?.avatarUrl,
                              size: 76,
                            ),
                            const SizedBox(width: 18),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  user?.fullName.isNotEmpty == true ? user!.fullName : 'Samuel Kofi Adusei',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w900,
                                    fontSize: 18,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                const Text(
                                  'Class: Class 2B (Junior High)',
                                  style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600),
                                ),
                                const Text(
                                  'ID: STU-2026-003',
                                  style: TextStyle(color: AppColors.primaryLight, fontSize: 12, fontWeight: FontWeight.w800),
                                ),
                              ],
                            ),
                          ],
                        ),

                        const SizedBox(height: 24),
                        const Divider(color: Colors.white24),
                        const SizedBox(height: 16),

                        // QR Simulation
                        Center(
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Column(
                              children: [
                                const Icon(LucideIcons.qrCode, size: 100, color: Colors.black87),
                                const SizedBox(height: 4),
                                Text(
                                  'SL-STU-003-2026-AUTH',
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w900,
                                    color: Colors.black.withAlpha(150),
                                    letterSpacing: 1,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),

                        const SizedBox(height: 12),
                        const Center(
                          child: Text(
                            'Scan at campus gate, library & dining hall',
                            style: TextStyle(fontSize: 10, color: Colors.white60, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  SlCard(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        const Icon(LucideIcons.shieldCheck, color: AppColors.emerald, size: 24),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Text(
                            'This verified credential is authenticated directly by the institutional registrar.',
                            style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          bottomNavigationBar: const _StudentIdBottomNav(),
        );
      },
    );
  }
}

class _StudentIdBottomNav extends StatelessWidget {
  const _StudentIdBottomNav();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkBgSecondary : AppColors.lightBgSecondary,
        border: Border(top: BorderSide(color: isDark ? AppColors.darkBorder : AppColors.lightBorder)),
      ),
      child: NavigationBar(
        selectedIndex: 3,
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
