import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/admin_drawer.dart';

class AdminLogisticsPage extends StatelessWidget {
  const AdminLogisticsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<LogisticsBloc>()..add(LoadBusRoutesEvent()),
      child: const _AdminLogisticsView(),
    );
  }
}

class _AdminLogisticsView extends StatelessWidget {
  const _AdminLogisticsView();

  void _viewTelemetryDialog(BuildContext context, BusRouteEntity route) {
    context.read<LogisticsBloc>().add(SelectBusRouteEvent(route));

    showDialog(
      context: context,
      builder: (ctx) => BlocProvider.value(
        value: BlocProvider.of<LogisticsBloc>(context),
        child: BlocBuilder<LogisticsBloc, LogisticsState>(
          builder: (dialogCtx, state) {
            final isDark = Theme.of(dialogCtx).brightness == Brightness.dark;
            final loc = state is LogisticsRoutesLoaded ? state.liveLocation : null;

            return AlertDialog(
              title: Text('${route.name} Live GPS', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              content: loc == null
                  ? const SizedBox(height: 100, child: Center(child: CircularProgressIndicator()))
                  : Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Driver: ${route.driverName}', style: const TextStyle(fontWeight: FontWeight.bold)),
                        Text('Phone: ${route.driverPhone}', style: TextStyle(color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted)),
                        Text('Vehicle Plate: ${route.vehiclePlate}', style: TextStyle(color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted, fontSize: 12)),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.emerald.withAlpha(20),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              const Icon(LucideIcons.navigation, color: AppColors.emerald, size: 20),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Status: ${loc.status}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                    Text('Speed: ${loc.speed.toStringAsFixed(1)} km/h', style: const TextStyle(fontSize: 12)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text('Coordinates: ${loc.latitude.toStringAsFixed(4)}, ${loc.longitude.toStringAsFixed(4)}', style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic)),
                      ],
                    ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close')),
              ],
            );
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      drawer: const AdminDrawer(currentRoute: '/logistics'),
      appBar: AppBar(
        title: const Text('Fleet & Campus Logistics', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.rotateCw, size: 20),
            onPressed: () => context.read<LogisticsBloc>().add(LoadBusRoutesEvent()),
          ),
        ],
      ),
      body: BlocBuilder<LogisticsBloc, LogisticsState>(
        builder: (context, state) {
          if (state is LogisticsLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is LogisticsError) {
            return Center(child: Text(state.message, style: const TextStyle(color: AppColors.rose)));
          }

          final routes = state is LogisticsRoutesLoaded ? state.routes : <BusRouteEntity>[];

          if (routes.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(LucideIcons.bus, size: 56, color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                  const SizedBox(height: 12),
                  Text('No active transport routes registered', style: TextStyle(color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted)),
                ],
              ),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: routes.length,
            separatorBuilder: (c, i) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final r = routes[index];
              return SlCard(
                padding: const EdgeInsets.all(16),
                onTap: () => _viewTelemetryDialog(context, r),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.amber.withAlpha(25),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(LucideIcons.bus, color: AppColors.amber, size: 22),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(r.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                              SlBadge(
                                text: r.vehiclePlate,
                                variant: SlBadgeVariant.primary,
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Driver: ${r.driverName} • ${r.driverPhone}',
                            style: TextStyle(
                              color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            '${r.stops.length} designated pick-up & drop-off stops',
                            style: const TextStyle(fontSize: 11, color: AppColors.primaryLight, fontWeight: FontWeight.w700),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Icon(LucideIcons.chevronRight, size: 16, color: AppColors.darkTextMuted),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}
