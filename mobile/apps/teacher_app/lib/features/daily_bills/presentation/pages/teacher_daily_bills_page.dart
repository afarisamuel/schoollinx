import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

class TeacherDailyBillsPage extends StatelessWidget {
  const TeacherDailyBillsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<DailyBillsBloc>()..add(const LoadDailyBillsEvent()),
      child: const _TeacherDailyBillsView(),
    );
  }
}

class _TeacherDailyBillsView extends StatefulWidget {
  const _TeacherDailyBillsView();

  @override
  State<_TeacherDailyBillsView> createState() => _TeacherDailyBillsViewState();
}

class _TeacherDailyBillsViewState extends State<_TeacherDailyBillsView> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _collectPaymentDialog(BuildContext context, DailyBillEntity bill) {
    String selectedMethod = 'CASH';

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (dialogCtx, setDialogState) {
            return AlertDialog(
              title: Text('Collect Bill: ${bill.billType}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Student: ${bill.studentName}', style: const TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 6),
                  Text(
                    'Amount: GHS ${bill.amount.toStringAsFixed(2)}',
                    style: const TextStyle(fontSize: 18, color: AppColors.primaryLight, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 16),
                  const Text('Payment Channel:', style: TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    initialValue: selectedMethod,
                    items: const [
                      DropdownMenuItem(value: 'CASH', child: Text('Physical Cash')),
                      DropdownMenuItem(value: 'MOMO', child: Text('MTN / Telecel MoMo')),
                      DropdownMenuItem(value: 'WALLET', child: Text('Student Canteen Pass')),
                    ],
                    onChanged: (val) {
                      if (val != null) {
                        setDialogState(() => selectedMethod = val);
                      }
                    },
                  ),
                ],
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(dialogCtx), child: const Text('Cancel')),
                ElevatedButton.icon(
                  icon: const Icon(LucideIcons.printer, size: 16),
                  label: const Text('Collect & Print Receipt'),
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.emerald, foregroundColor: Colors.white),
                  onPressed: () {
                    Navigator.pop(dialogCtx);
                    context.read<DailyBillsBloc>().add(
                      CollectBillPaymentEvent(billId: bill.id, paymentMethod: selectedMethod),
                    );
                  },
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showShiftReconciliationDialog(BuildContext context, double systemTotal) {
    final cashController = TextEditingController(text: systemTotal.toStringAsFixed(2));
    final notesController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) {
        final isDark = Theme.of(sheetCtx).brightness == Brightness.dark;

        return Container(
          padding: EdgeInsets.only(
            top: 24,
            left: 20,
            right: 20,
            bottom: MediaQuery.of(sheetCtx).viewInsets.bottom + 24,
          ),
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkCardBg : AppColors.lightCardBg,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
            border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'End-of-Shift Cash Reconciliation',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17),
              ),
              const SizedBox(height: 6),
              Text(
                'Audit system tally vs physical envelope cash before handover.',
                style: TextStyle(color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted, fontSize: 12),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.primary.withAlpha(20),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('System Ledger Total:', style: TextStyle(fontWeight: FontWeight.w700)),
                    Text(
                      'GHS ${systemTotal.toStringAsFixed(2)}',
                      style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.primaryLight, fontSize: 16),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              SlInput(
                label: 'PHYSICAL CASH COUNTED (GHS)',
                controller: cashController,
                keyboardType: TextInputType.number,
                prefixIcon: const Icon(LucideIcons.banknote, size: 18),
              ),
              const SizedBox(height: 12),
              SlInput(
                label: 'RECONCILIATION NOTES',
                controller: notesController,
                hintText: 'e.g. Shift balanced with zero cash discrepancy.',
                prefixIcon: const Icon(LucideIcons.fileCheck, size: 18),
              ),
              const SizedBox(height: 20),
              SlButton(
                text: 'Reconcile & Sign Off Shift',
                icon: const Icon(LucideIcons.checkCheck, size: 18, color: Colors.white),
                onPressed: () {
                  final physical = double.tryParse(cashController.text.trim()) ?? systemTotal;
                  Navigator.pop(sheetCtx);
                  context.read<DailyBillsBloc>().add(
                    ReconcileDailyShiftEvent(
                      physicalCash: physical,
                      notes: notesController.text.trim(),
                    ),
                  );
                },
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BlocConsumer<DailyBillsBloc, DailyBillsState>(
      listener: (context, state) {
        if (state is BillCollectedSuccessState) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('🧾 Payment collected & instant Arkasel SMS receipt dispatched to parent!'),
              backgroundColor: AppColors.emerald,
              behavior: SnackBarBehavior.floating,
            ),
          );
        } else if (state is ShiftReconciledSuccessState) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('🎉 Shift ${state.reconciliation.shiftId} closed with status: ${state.reconciliation.status}!'),
              backgroundColor: AppColors.emerald,
              behavior: SnackBarBehavior.floating,
            ),
          );
        } else if (state is DailyBillsError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('⚠️ ${state.message}'),
              backgroundColor: AppColors.rose,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      },
      builder: (context, state) {
        List<DailyBillEntity> pendingBills = [];
        List<DailyBillEntity> myCollections = [];
        double totalPending = 0.0;
        double totalCollected = 0.0;

        if (state is DailyBillsLoaded) {
          pendingBills = state.pendingBills;
          myCollections = state.myCollections;
          totalPending = state.totalPendingAmount;
          totalCollected = state.totalCollectedAmount;
        }

        return Scaffold(
          appBar: AppBar(
            title: const Text('Daily Bill Collections', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
            actions: [
              IconButton(
                icon: const Icon(LucideIcons.rotateCw, size: 20),
                onPressed: () => context.read<DailyBillsBloc>().add(const LoadDailyBillsEvent()),
              ),
            ],
            bottom: TabBar(
              controller: _tabController,
              tabs: [
                Tab(text: 'Pending (${pendingBills.length} • GHS ${totalPending.toStringAsFixed(0)})'),
                Tab(text: 'My Collections (${myCollections.length})'),
              ],
            ),
          ),
          body: state is DailyBillsLoading
              ? const Center(child: CircularProgressIndicator())
              : TabBarView(
                  controller: _tabController,
                  children: [
                    // Tab 1: Pending Bills
                    pendingBills.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(LucideIcons.checkCircle2, size: 56, color: AppColors.emerald),
                                const SizedBox(height: 12),
                                Text('All daily bills collected!', style: TextStyle(color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted)),
                              ],
                            ),
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.all(16),
                            itemCount: pendingBills.length,
                            separatorBuilder: (c, i) => const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final bill = pendingBills[index];
                              return SlCard(
                                padding: const EdgeInsets.all(16),
                                child: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: AppColors.primary.withAlpha(25),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Icon(
                                        bill.billType == 'BUS' || bill.billType == 'TRANSIT' ? LucideIcons.bus : LucideIcons.utensils,
                                        color: AppColors.primary,
                                        size: 22,
                                      ),
                                    ),
                                    const SizedBox(width: 14),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(bill.studentName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                                          Text(
                                            '${bill.className} • ${bill.billType}',
                                            style: TextStyle(
                                              color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                                              fontSize: 12,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                          Text('GHS ${bill.amount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.primaryLight)),
                                        ],
                                      ),
                                    ),
                                    ElevatedButton(
                                      onPressed: () => _collectPaymentDialog(context, bill),
                                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.emerald, foregroundColor: Colors.white),
                                      child: const Text('Collect'),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),

                    // Tab 2: My Collections & Shift Reconciliation
                    Column(
                      children: [
                        Container(
                          width: double.infinity,
                          margin: const EdgeInsets.all(16),
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(colors: [Color(0xFF0F766E), Color(0xFF14B8A6)]),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text('Total Collected Today', style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600)),
                                  InkWell(
                                    onTap: () => _showShiftReconciliationDialog(context, totalCollected),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: Colors.white24,
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: const Row(
                                        children: [
                                          Icon(LucideIcons.scale, size: 14, color: Colors.white),
                                          SizedBox(width: 4),
                                          Text('Reconcile Shift', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text('GHS ${totalCollected.toStringAsFixed(2)}', style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900)),
                              const SizedBox(height: 4),
                              Text('${myCollections.length} total receipts processed today', style: const TextStyle(color: Colors.white70, fontSize: 11)),
                            ],
                          ),
                        ),
                        Expanded(
                          child: myCollections.isEmpty
                              ? Center(child: Text('No collections recorded yet today', style: TextStyle(color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted)))
                              : ListView.separated(
                                  padding: const EdgeInsets.symmetric(horizontal: 16),
                                  itemCount: myCollections.length,
                                  separatorBuilder: (c, i) => const SizedBox(height: 10),
                                  itemBuilder: (context, index) {
                                    final col = myCollections[index];
                                    return SlCard(
                                      padding: const EdgeInsets.all(14),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(col.studentName, style: const TextStyle(fontWeight: FontWeight.w800)),
                                              Text(
                                                '${col.billType} • ${DateFormat('hh:mm a').format(col.billDate)}',
                                                style: TextStyle(
                                                  color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                                                  fontSize: 11,
                                                ),
                                              ),
                                            ],
                                          ),
                                          SlBadge(
                                            text: '+GHS ${col.amount.toStringAsFixed(2)}',
                                            variant: SlBadgeVariant.success,
                                          ),
                                        ],
                                      ),
                                    );
                                  },
                                ),
                        ),
                      ],
                    ),
                  ],
                ),
        );
      },
    );
  }
}
