import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

class ParentFeesPage extends StatelessWidget {
  const ParentFeesPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<FinanceBloc>()..add(const FetchFeeRecordsEvent()),
      child: const _ParentFeesView(),
    );
  }
}

class _ParentFeesView extends StatefulWidget {
  const _ParentFeesView();

  @override
  State<_ParentFeesView> createState() => _ParentFeesViewState();
}

class _ParentFeesViewState extends State<_ParentFeesView> {
  String _paymentMethod = 'mtn_momo';
  final _amountController = TextEditingController();
  final _phoneController = TextEditingController(text: '0241234567');
  FeeRecordEntity? _selectedRecord;

  @override
  void dispose() {
    _amountController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  void _processPayment(BuildContext context) {
    final amount = double.tryParse(_amountController.text.trim()) ?? 0.0;
    if (amount <= 0 || _selectedRecord == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a fee bill and enter a valid amount.'), backgroundColor: AppColors.rose),
      );
      return;
    }

    context.read<FinanceBloc>().add(
      InitiatePaystackPaymentEvent(
        amount: amount,
        email: 'guardian@schoollinx.com',
        feeRecordId: _selectedRecord!.id,
        channel: _paymentMethod.contains('momo') ? 'momo' : 'card',
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BlocConsumer<FinanceBloc, FinanceState>(
      listener: (context, state) {
        if (state is PaymentInitiatedState) {
          showDialog(
            context: context,
            builder: (dialogCtx) => AlertDialog(
              title: const Row(
                children: [
                  Icon(LucideIcons.checkCircle2, color: AppColors.emerald, size: 24),
                  SizedBox(width: 10),
                  Text('Payment Initialized', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                ],
              ),
              content: Text(
                'Paystack transaction reference:\n${state.response.reference}\n\nMobile Money prompt dispatched to ${_phoneController.text}. Enter your MoMo PIN on your phone to complete instant settlement.',
              ),
              actions: [
                FilledButton(
                  onPressed: () {
                    Navigator.pop(dialogCtx);
                    context.read<FinanceBloc>().add(const FetchFeeRecordsEvent());
                  },
                  child: const Text('I Have Approved Prompt'),
                ),
              ],
            ),
          );
        } else if (state is FinanceError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: AppColors.rose),
          );
        }
      },
      builder: (context, state) {
        List<FeeRecordEntity> records = [];
        if (state is FeeRecordsLoaded) {
          records = state.records;
          if (_selectedRecord == null && records.isNotEmpty) {
            _selectedRecord = records.firstWhere((r) => r.balance > 0, orElse: () => records.first);
            _amountController.text = _selectedRecord!.balance.toStringAsFixed(2);
          }
        }

        final totalBalance = records.fold(0.0, (acc, r) => acc + r.balance);

        return Scaffold(
          appBar: AppBar(
            title: const Text('Fee Payments & Invoices', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
            actions: [
              IconButton(
                icon: const Icon(LucideIcons.rotateCw, size: 20),
                onPressed: () => context.read<FinanceBloc>().add(const FetchFeeRecordsEvent()),
              ),
            ],
          ),
          body: state is FinanceLoading && records.isEmpty
              ? const Center(child: CircularProgressIndicator())
              : SafeArea(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Outstanding Bill Card
                        SlCard(
                          borderColor: totalBalance > 0 ? AppColors.rose.withAlpha(50) : AppColors.emerald.withAlpha(50),
                          backgroundColor: totalBalance > 0 ? AppColors.rose.withAlpha(15) : AppColors.emerald.withAlpha(15),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('FAMILY OUTSTANDING BALANCE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.darkTextMuted)),
                              const SizedBox(height: 6),
                              Text(
                                'GH₵ ${totalBalance.toStringAsFixed(2)}',
                                style: TextStyle(
                                  fontSize: 26,
                                  fontWeight: FontWeight.w900,
                                  color: totalBalance > 0 ? AppColors.roseLight : AppColors.emeraldLight,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                totalBalance > 0 ? 'Across ${records.length} active fee schedule(s)' : 'All term bills cleared in full',
                                style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 24),

                        // Select Fee Bill Item
                        const Text(
                          'SELECT FEE SCHEDULE TO PAY',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1.2, color: AppColors.darkTextMuted),
                        ),
                        const SizedBox(height: 10),

                        if (records.isEmpty)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 20),
                            child: Center(child: Text('No active invoices found.')),
                          )
                        else
                          ...records.map((record) {
                            final isSelected = _selectedRecord?.id == record.id;
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: InkWell(
                                onTap: () {
                                  setState(() {
                                    _selectedRecord = record;
                                    _amountController.text = record.balance.toStringAsFixed(2);
                                  });
                                },
                                borderRadius: BorderRadius.circular(16),
                                child: SlCard(
                                  borderColor: isSelected ? AppColors.emerald : null,
                                  backgroundColor: isSelected ? AppColors.emerald.withAlpha(15) : null,
                                  padding: const EdgeInsets.all(14),
                                  child: Row(
                                    children: [
                                      Icon(
                                        isSelected ? LucideIcons.checkCircle2 : LucideIcons.circle,
                                        color: isSelected ? AppColors.emeraldLight : (isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                                        size: 20,
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              '${record.studentName} • ${record.className}',
                                              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              record.title,
                                              style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.end,
                                        children: [
                                          Text(
                                            'GH₵ ${record.balance.toStringAsFixed(2)}',
                                            style: TextStyle(
                                              fontWeight: FontWeight.w800,
                                              fontSize: 14,
                                              color: record.balance > 0 ? AppColors.roseLight : AppColors.emeraldLight,
                                            ),
                                          ),
                                          SlBadge(
                                            text: record.status,
                                            variant: record.status == 'PAID' ? SlBadgeVariant.success : SlBadgeVariant.warning,
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          }),

                        const SizedBox(height: 24),

                        // Payment Form
                        SlCard(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('PAYMENT DETAILS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.darkTextMuted)),
                              const SizedBox(height: 14),

                              SlInput(
                                controller: _amountController,
                                label: 'AMOUNT TO PAY (GH₵)',
                                hintText: '450.00',
                                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                prefixIcon: const Icon(LucideIcons.dollarSign, size: 18),
                              ),
                              const SizedBox(height: 14),

                              SlInput(
                                controller: _phoneController,
                                label: 'PAYER PHONE NUMBER (MOMO / RECEIPT)',
                                hintText: '024XXXXXXX',
                                keyboardType: TextInputType.phone,
                                prefixIcon: const Icon(LucideIcons.phone, size: 18),
                              ),
                              const SizedBox(height: 18),

                              const Text('SELECT PAYMENT CHANNEL', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.darkTextMuted)),
                              const SizedBox(height: 10),

                              Column(
                                children: [
                                  _PaymentMethodTile(
                                    title: 'MTN Mobile Money',
                                    subtitle: 'Instant MoMo PIN prompt on phone',
                                    value: 'mtn_momo',
                                    groupValue: _paymentMethod,
                                    onSelect: (v) => setState(() => _paymentMethod = v),
                                  ),
                                  const SizedBox(height: 8),
                                  _PaymentMethodTile(
                                    title: 'Telecel Cash / AT Money',
                                    subtitle: 'Direct voucher debit',
                                    value: 'telecel_cash',
                                    groupValue: _paymentMethod,
                                    onSelect: (v) => setState(() => _paymentMethod = v),
                                  ),
                                  const SizedBox(height: 8),
                                  _PaymentMethodTile(
                                    title: 'Debit / Credit Card',
                                    subtitle: 'Visa & Mastercard secured gateway',
                                    value: 'card',
                                    groupValue: _paymentMethod,
                                    onSelect: (v) => setState(() => _paymentMethod = v),
                                  ),
                                ],
                              ),

                              const SizedBox(height: 20),

                              SlButton(
                                text: 'Pay GH₵ ${_amountController.text.isEmpty ? "0.00" : _amountController.text}',
                                icon: const Icon(LucideIcons.lock, size: 18, color: Colors.white),
                                isLoading: state is FinanceLoading,
                                onPressed: () => _processPayment(context),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
          bottomNavigationBar: const _ParentFeesBottomNav(),
        );
      },
    );
  }
}

class _ParentFeesBottomNav extends StatelessWidget {
  const _ParentFeesBottomNav();

  @override
  Widget build(BuildContext context) {
    return NavigationBar(
      selectedIndex: 1,
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

class _PaymentMethodTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final String value;
  final String groupValue;
  final ValueChanged<String> onSelect;

  const _PaymentMethodTile({
    required this.title,
    required this.subtitle,
    required this.value,
    required this.groupValue,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    final isSelected = value == groupValue;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      onTap: () => onSelect(value),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.emerald.withAlpha(20) : (isDark ? AppColors.darkBgSecondary : AppColors.lightBgSecondary),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.emerald : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(
              isSelected ? LucideIcons.checkCircle2 : LucideIcons.circle,
              color: isSelected ? AppColors.emerald : AppColors.darkTextMuted,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: isSelected ? AppColors.emeraldLight : null)),
                  Text(subtitle, style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

