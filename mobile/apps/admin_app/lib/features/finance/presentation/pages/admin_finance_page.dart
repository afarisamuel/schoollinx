import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/admin_drawer.dart';

class AdminFinancePage extends StatelessWidget {
  const AdminFinancePage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<FinanceBloc>()..add(FetchFiscalSummaryEvent()),
      child: const _AdminFinanceView(),
    );
  }
}

class _AdminFinanceView extends StatelessWidget {
  const _AdminFinanceView();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      drawer: const AdminDrawer(currentRoute: '/finance'),
      appBar: AppBar(
        title: const Text('Fiscal Intelligence', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, size: 18),
            onPressed: () => context.read<FinanceBloc>().add(FetchFiscalSummaryEvent()),
          ),
        ],
      ),
      body: SafeArea(
        child: BlocBuilder<FinanceBloc, FinanceState>(
          builder: (context, state) {
            if (state is FinanceLoading) {
              return const Center(child: CircularProgressIndicator());
            }

            if (state is FinanceError) {
              return Center(child: Text(state.message, style: const TextStyle(color: AppColors.rose)));
            }

            final summary = state is FiscalSummaryLoaded ? state.summary : null;
            final records = state is FiscalSummaryLoaded ? state.records : <FeeRecordEntity>[];

            final revenue = summary?.totalRevenue ?? 142850.0;
            final outstanding = summary?.totalOutstanding ?? 27150.0;
            final collectionRate = summary?.collectionRate ?? 84.0;
            final target = summary?.monthlyTarget ?? 170000.0;

            return SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Total Balance Bento Card
                  SlCard(
                    hasGradient: true,
                    padding: const EdgeInsets.all(22),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'TOTAL COLLECTED (TERM 1)',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.darkTextMuted, letterSpacing: 1),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.emerald.withAlpha(30),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                '${collectionRate.toStringAsFixed(1)}% Rate',
                                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.emeraldLight),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'GH₵ ${revenue.toStringAsFixed(2)}',
                          style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900, letterSpacing: -0.5),
                        ),
                        const SizedBox(height: 14),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: LinearProgressIndicator(
                            value: (collectionRate / 100).clamp(0.0, 1.0),
                            minHeight: 8,
                            backgroundColor: Colors.white12,
                            valueColor: const AlwaysStoppedAnimation<Color>(AppColors.emerald),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Target: GH₵ ${target.toStringAsFixed(2)}', style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted)),
                            Text('${collectionRate.toStringAsFixed(0)}% Completed', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.emeraldLight)),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Quick Stats 2-Col Bento
                  Row(
                    children: [
                      Expanded(
                        child: SlCard(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Row(
                                children: [
                                  Icon(LucideIcons.alertCircle, size: 16, color: AppColors.amber),
                                  SizedBox(width: 6),
                                  Text('Outstanding Arrears', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'GH₵ ${outstanding.toStringAsFixed(2)}',
                                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.amber),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: SlCard(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Row(
                                children: [
                                  Icon(LucideIcons.checkCircle2, size: 16, color: AppColors.emerald),
                                  SizedBox(width: 6),
                                  Text('Defaulters Count', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                '${summary?.totalStudentsDefaulting ?? 38} Students',
                                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.emeraldLight),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // Recent Payment Transactions
                  const Text(
                    'RECENT BILLING RECORDS & PAYMENTS',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.2, color: AppColors.darkTextMuted),
                  ),
                  const SizedBox(height: 12),

                  if (records.isEmpty)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(24),
                        child: Text('No fee records found.', style: TextStyle(fontWeight: FontWeight.w600)),
                      ),
                    )
                  else
                    ...records.map((r) {
                      final isPaid = r.status.toUpperCase() == 'PAID';
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _TransactionTile(
                          studentName: r.studentName,
                          className: r.className,
                          amount: 'GH₵ ${r.amountPaid.toStringAsFixed(2)}',
                          method: r.paymentMethod ?? 'Paystack MoMo',
                          date: 'Due: ${r.dueDate.day}/${r.dueDate.month}/${r.dueDate.year}',
                          status: isPaid ? 'Paid in Full' : 'GH₵ ${r.balance.toStringAsFixed(2)} Due',
                          isVerified: isPaid,
                        ),
                      );
                    }),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _TransactionTile extends StatelessWidget {
  final String studentName;
  final String className;
  final String amount;
  final String method;
  final String date;
  final String status;
  final bool isVerified;

  const _TransactionTile({
    required this.studentName,
    required this.className,
    required this.amount,
    required this.method,
    required this.date,
    required this.status,
    this.isVerified = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SlCard(
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: isVerified ? AppColors.emerald.withAlpha(25) : AppColors.amber.withAlpha(25),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              isVerified ? LucideIcons.arrowDownLeft : LucideIcons.clock,
              color: isVerified ? AppColors.emeraldLight : AppColors.amber,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  studentName,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                ),
                const SizedBox(height: 2),
                Text(
                  '$className • $method',
                  style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                ),
                Text(
                  date,
                  style: TextStyle(fontSize: 10, color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                amount,
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 14,
                  color: isVerified ? AppColors.emeraldLight : AppColors.amber,
                ),
              ),
              const SizedBox(height: 4),
              SlBadge(
                text: status,
                variant: isVerified ? SlBadgeVariant.success : SlBadgeVariant.warning,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
