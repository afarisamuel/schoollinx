import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

class AdminDefaultersPage extends StatelessWidget {
  const AdminDefaultersPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<DefaultersBloc>()..add(FetchDefaultersEvent()),
      child: const _AdminDefaultersView(),
    );
  }
}

class _AdminDefaultersView extends StatelessWidget {
  const _AdminDefaultersView();

  void _sendReminderDialog(BuildContext context, FeeRecordEntity record) {
    final messageController = TextEditingController(
      text: 'Dear Parent, gentle reminder that school fees balance of GHS ${record.balance.toStringAsFixed(2)} for ${record.studentName} is overdue. Kindly pay via the SchoolLinx Parent App.',
    );

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Send Fee Reminder SMS', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Student: ${record.studentName}', style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text('Outstanding: GHS ${record.balance.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.rose)),
            const SizedBox(height: 16),
            SlInput(
              label: 'SMS Message',
              controller: messageController,
              maxLines: 4,
              prefixIcon: const Icon(LucideIcons.messageSquare, size: 18),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.read<DefaultersBloc>().add(
                    SendBulkDunningSmsEvent(
                      studentIds: [record.studentId],
                      template: messageController.text.trim(),
                    ),
                  );
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white),
            child: const Text('Send SMS'),
          ),
        ],
      ),
    );
  }

  void _sendBulkDunningDialog(BuildContext context, List<FeeRecordEntity> defaulters) {
    final messageController = TextEditingController(
      text: 'Dear Parent, this is an official reminder that term school fees are overdue. Kindly settle the outstanding balance on the SchoolLinx app to avoid examination restriction.',
    );

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Bulk Dunning SMS (${defaulters.length} Parents)', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Broadcasting payment dunning notices to all ${defaulters.length} accounts with overdue balances.', style: const TextStyle(fontSize: 12)),
            const SizedBox(height: 16),
            SlInput(
              label: 'Arkasel Bulk SMS Template',
              controller: messageController,
              maxLines: 4,
              prefixIcon: const Icon(LucideIcons.messageSquare, size: 18),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.read<DefaultersBloc>().add(
                    SendBulkDunningSmsEvent(
                      studentIds: defaulters.map((d) => d.studentId).toList(),
                      template: messageController.text.trim(),
                    ),
                  );
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.rose, foregroundColor: Colors.white),
            child: const Text('Broadcast Arkasel SMS'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BlocConsumer<DefaultersBloc, DefaultersState>(
      listener: (context, state) {
        if (state is DunningSmsDispatchedState) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Bulk fee dunning SMS dispatched to ${state.count} parents via Arkasel!'),
              backgroundColor: AppColors.emerald,
            ),
          );
        } else if (state is DefaultersError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: AppColors.rose),
          );
        }
      },
      builder: (context, state) {
        final defaulters = state is DefaultersLoaded ? state.filteredDefaulters : <FeeRecordEntity>[];
        final totalArrears = state is DefaultersLoaded ? state.totalOutstanding : 0.0;

        return Scaffold(
          appBar: AppBar(
            title: const Text('Fee Defaulters & Arrears', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
            actions: [
              IconButton(
                icon: const Icon(LucideIcons.rotateCw, size: 20),
                onPressed: () => context.read<DefaultersBloc>().add(FetchDefaultersEvent()),
              ),
            ],
          ),
          floatingActionButton: defaulters.isNotEmpty
              ? FloatingActionButton.extended(
                  onPressed: () => _sendBulkDunningDialog(context, defaulters),
                  icon: const Icon(LucideIcons.send, size: 18, color: Colors.white),
                  label: const Text('Bulk Dunning SMS', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                  backgroundColor: AppColors.rose,
                )
              : null,
          body: Builder(
            builder: (context) {
              if (state is DefaultersLoading) {
                return const Center(child: CircularProgressIndicator());
              }

              if (state is DefaultersError) {
                return Center(child: Text(state.message, style: const TextStyle(color: AppColors.rose)));
              }

              return Column(
                children: [
                  Container(
                    width: double.infinity,
                    margin: const EdgeInsets.all(16),
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFE11D48), Color(0xFFBE123C)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFFBE123C).withAlpha(80),
                          blurRadius: 15,
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
                            Text(
                              'TOTAL UNPAID ARREARS',
                              style: TextStyle(
                                color: Colors.white.withAlpha(200),
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 1.2,
                              ),
                            ),
                            const Icon(LucideIcons.alertTriangle, color: Colors.white, size: 22),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'GHS ${totalArrears.toStringAsFixed(2)}',
                          style: const TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w900),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${defaulters.length} students with overdue accounts',
                          style: TextStyle(color: Colors.white.withAlpha(220), fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: defaulters.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(LucideIcons.checkCircle2, size: 56, color: AppColors.emerald),
                                const SizedBox(height: 12),
                                Text('All student fee accounts are fully settled!', style: TextStyle(color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted)),
                              ],
                            ),
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            itemCount: defaulters.length,
                            separatorBuilder: (c, i) => const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final item = defaulters[index];
                              return SlCard(
                                padding: const EdgeInsets.all(16),
                                child: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: AppColors.rose.withAlpha(25),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: const Icon(LucideIcons.userX, color: AppColors.rose, size: 22),
                                    ),
                                    const SizedBox(width: 14),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(item.studentName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                                          Text(
                                            '${item.title} • ${DateFormat('MMM d, yyyy').format(item.dueDate)}',
                                            style: TextStyle(
                                              color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                                              fontSize: 11,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                          Text(
                                            'GHS ${item.balance.toStringAsFixed(2)}',
                                            style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.rose, fontSize: 14),
                                          ),
                                        ],
                                      ),
                                    ),
                                    ElevatedButton.icon(
                                      onPressed: () => _sendReminderDialog(context, item),
                                      icon: const Icon(LucideIcons.send, size: 12),
                                      label: const Text('SMS'),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AppColors.primary,
                                        foregroundColor: Colors.white,
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                  ),
                ],
              );
            },
          ),
        );
      },
    );
  }
}
