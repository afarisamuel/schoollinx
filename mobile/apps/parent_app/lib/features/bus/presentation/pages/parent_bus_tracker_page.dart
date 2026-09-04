import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/parent_drawer.dart';

class ParentBusTrackerPage extends StatelessWidget {
  const ParentBusTrackerPage({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(
          create: (context) => sl<LogisticsBloc>()..add(LoadBusRoutesEvent()),
        ),
        BlocProvider(
          create: (context) => sl<GuardianBloc>()..add(LoadGuardianChildrenEvent()),
        ),
      ],
      child: const _ParentBusTrackerView(),
    );
  }
}

class _ParentBusTrackerView extends StatelessWidget {
  const _ParentBusTrackerView();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      drawer: const ParentDrawer(currentRoute: '/bus'),
      appBar: AppBar(
        title: const Text('Live Transit & Gate Pass', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, size: 18),
            onPressed: () {
              context.read<LogisticsBloc>().add(LoadBusRoutesEvent());
              context.read<GuardianBloc>().add(LoadGuardianChildrenEvent());
            },
          ),
        ],
      ),
      body: SafeArea(
        child: BlocBuilder<LogisticsBloc, LogisticsState>(
          builder: (context, logisticsState) {
            return BlocBuilder<GuardianBloc, GuardianState>(
              builder: (context, guardianState) {
                if (logisticsState is LogisticsLoading || guardianState is GuardianLoading) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (logisticsState is LogisticsError) {
                  return Center(child: Text('Error: ${logisticsState.message}'));
                }

                final routes = logisticsState is LogisticsRoutesLoaded ? logisticsState.routes : <BusRouteEntity>[];
                final activeRoute = logisticsState is LogisticsRoutesLoaded ? logisticsState.selectedRoute : null;
                final liveLoc = logisticsState is LogisticsRoutesLoaded ? logisticsState.liveLocation : null;
                final speed = liveLoc?.speed ?? 32.0;

                final pass = guardianState is GuardianChildrenLoaded ? guardianState.pickupPass : null;

                return SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Map Container with Live GPS
                      Container(
                        height: 200,
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF0F172A) : const Color(0xFFE2E8F0),
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                        ),
                        child: Stack(
                          children: [
                            Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Container(
                                    width: 50,
                                    height: 50,
                                    decoration: BoxDecoration(
                                      color: AppColors.amber.withAlpha(30),
                                      shape: BoxShape.circle,
                                      border: Border.all(color: AppColors.amber, width: 2),
                                    ),
                                    child: const Center(
                                      child: Icon(LucideIcons.bus, color: AppColors.amber, size: 24),
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    activeRoute != null ? '${activeRoute.name} (${activeRoute.vehiclePlate})' : 'Campus Transit Fleet',
                                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                                  ),
                                  Text(
                                    'Current Speed: ${speed.toStringAsFixed(0)} km/h • ${liveLoc?.status ?? "On Route"}',
                                    style: const TextStyle(fontSize: 11, color: AppColors.emeraldLight, fontWeight: FontWeight.w600),
                                  ),
                                ],
                              ),
                            ),
                            const Positioned(
                              top: 14,
                              right: 14,
                              child: SlBadge(text: 'LIVE GPS', variant: SlBadgeVariant.success),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 20),

                      // Gate Security Pickup Pass
                      if (pass != null)
                        SlCard(
                          hasGradient: true,
                          borderColor: AppColors.emerald.withAlpha(60),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'STUDENT GATE PICKUP PASS',
                                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1.2, color: AppColors.darkTextMuted),
                                  ),
                                  SlBadge(
                                    text: 'Valid Today',
                                    variant: SlBadgeVariant.success,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Container(
                                    width: 70,
                                    height: 70,
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: const Center(
                                      child: Icon(LucideIcons.qrCode, color: Colors.black, size: 48),
                                    ),
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          pass.childName,
                                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                                        ),
                                        Text(
                                          'Authorized Guardian: ${pass.guardianName}',
                                          style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          'Gate Code: ${pass.code}',
                                          style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w900,
                                            letterSpacing: 2,
                                            color: AppColors.emeraldLight,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 14),
                              SlButton(
                                text: 'Regenerate Dynamic Gate OTP',
                                variant: SlButtonVariant.secondary,
                                height: 38,
                                icon: const Icon(LucideIcons.refreshCw, size: 14),
                                onPressed: () {
                                  context.read<GuardianBloc>().add(FetchChildPickupPassEvent(pass.childId));
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Regenerating 6-digit gate code...'),
                                      backgroundColor: AppColors.emerald,
                                    ),
                                  );
                                },
                              ),
                            ],
                          ),
                        ),

                      const SizedBox(height: 20),

                      // Route Stops Timeline
                      const Text(
                        'TRANSIT STOPS & ESTIMATES',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.2, color: AppColors.darkTextMuted),
                      ),
                      const SizedBox(height: 12),

                      if (activeRoute != null && activeRoute.stops.isNotEmpty)
                        ...activeRoute.stops.asMap().entries.map((entry) {
                          final idx = entry.key;
                          final stop = entry.value;
                          final isPassed = idx < activeRoute.stops.length - 1;
                          return _StopTimelineTile(
                            stopName: stop,
                            time: '${7 + (idx * 15 ~/ 60)}:${((15 * idx) % 60).toString().padLeft(2, '0')} AM',
                            isPassed: isPassed,
                            isBoardingStop: idx == 1,
                          );
                        })
                      else if (routes.isNotEmpty && routes.first.stops.isNotEmpty)
                        ...routes.first.stops.asMap().entries.map((entry) {
                          final idx = entry.key;
                          final stop = entry.value;
                          return _StopTimelineTile(
                            stopName: stop,
                            time: '${7 + (idx * 15 ~/ 60)}:${((15 * idx) % 60).toString().padLeft(2, '0')} AM',
                            isPassed: idx == 0,
                            isBoardingStop: idx == 0,
                          );
                        })
                      else
                        const SlCard(
                          child: Center(
                            child: Padding(
                              padding: EdgeInsets.all(16.0),
                              child: Text('No active transit stops found for this route.'),
                            ),
                          ),
                        ),
                    ],
                  ),
                );
              },
            );
          },
        ),
      ),
      bottomNavigationBar: const _ParentBusBottomNav(),
    );
  }
}

class _StopTimelineTile extends StatelessWidget {
  final String stopName;
  final String time;
  final bool isPassed;
  final bool isBoardingStop;

  const _StopTimelineTile({
    required this.stopName,
    required this.time,
    required this.isPassed,
    this.isBoardingStop = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: SlCard(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        borderColor: isBoardingStop ? AppColors.emerald.withAlpha(80) : null,
        child: Row(
          children: [
            Icon(
              isPassed ? LucideIcons.checkCircle2 : LucideIcons.circle,
              color: isPassed ? AppColors.emeraldLight : AppColors.darkTextMuted,
              size: 18,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                stopName,
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                  color: isBoardingStop ? AppColors.emeraldLight : null,
                ),
              ),
            ),
            Text(
              time,
              style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
            ),
          ],
        ),
      ),
    );
  }
}

class _ParentBusBottomNav extends StatelessWidget {
  const _ParentBusBottomNav();

  @override
  Widget build(BuildContext context) {
    return NavigationBar(
      selectedIndex: 3,
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
