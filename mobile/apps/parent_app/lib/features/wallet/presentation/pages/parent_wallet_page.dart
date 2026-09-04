import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

class ParentWalletPage extends StatelessWidget {
  const ParentWalletPage({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(
          create: (context) => sl<GuardianBloc>()..add(LoadGuardianChildrenEvent()),
        ),
        BlocProvider(
          create: (context) => sl<WalletBloc>(),
        ),
      ],
      child: const _ParentWalletView(),
    );
  }
}

class _ParentWalletView extends StatefulWidget {
  const _ParentWalletView();

  @override
  State<_ParentWalletView> createState() => _ParentWalletViewState();
}

class _ParentWalletViewState extends State<_ParentWalletView> {
  ChildEntity? _selectedChild;

  void _showTopUpDialog(BuildContext context, ChildEntity child) {
    final amountController = TextEditingController();
    String method = 'MOMO';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (bottomSheetContext, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(
                top: 24,
                left: 20,
                right: 20,
                bottom: MediaQuery.of(bottomSheetContext).viewInsets.bottom + 24,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Top Up ${child.firstName}\'s Wallet', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                      IconButton(icon: const Icon(LucideIcons.x, size: 20), onPressed: () => Navigator.pop(ctx)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  SlInput(
                    label: 'Amount (GHS)',
                    controller: amountController,
                    keyboardType: TextInputType.number,
                    prefixIcon: const Icon(LucideIcons.creditCard, size: 18),
                    hintText: 'e.g. 50.00',
                  ),
                  const SizedBox(height: 16),
                  const Text('Payment Channel:', style: TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    initialValue: method,
                    items: const [
                      DropdownMenuItem(value: 'MOMO', child: Text('MTN / Telecel / AT Mobile Money')),
                      DropdownMenuItem(value: 'CARD', child: Text('Visa / Mastercard Debit Card')),
                    ],
                    onChanged: (val) {
                      if (val != null) setSheetState(() => method = val);
                    },
                  ),
                  const SizedBox(height: 24),
                  SlButton(
                    text: 'Confirm & Top Up',
                    icon: const Icon(LucideIcons.arrowUpRight, size: 18, color: Colors.white),
                    onPressed: () {
                      final amt = double.tryParse(amountController.text.trim()) ?? 0.0;
                      if (amt <= 0) return;
                      context.read<WalletBloc>().add(
                            TopupStudentWalletEvent(
                              studentId: child.id,
                              amount: amt,
                              paymentMethod: method,
                            ),
                          );
                      Navigator.pop(ctx);
                    },
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _showLimitDialog(BuildContext context, StudentWalletEntity wallet) {
    double currentLimit = wallet.dailyLimit;

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (sheetCtx, setSheetState) {
            return Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text('Canteen Daily Spending Cap', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                  const SizedBox(height: 8),
                  Text(
                    'Set maximum daily pocket money spending limit for canteen purchases.',
                    style: TextStyle(color: Colors.grey[600], fontSize: 13),
                  ),
                  const SizedBox(height: 20),
                  Center(
                    child: Text(
                      'GHS ${currentLimit.toStringAsFixed(0)} / day',
                      style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.primary),
                    ),
                  ),
                  Slider(
                    value: currentLimit,
                    min: 10,
                    max: 200,
                    divisions: 19,
                    label: 'GHS ${currentLimit.toStringAsFixed(0)}',
                    onChanged: (val) {
                      setSheetState(() => currentLimit = val);
                    },
                  ),
                  const SizedBox(height: 16),
                  SlButton(
                    text: 'Save Spending Cap',
                    onPressed: () {
                      context.read<WalletBloc>().add(
                            UpdateDailySpendingLimitEvent(
                              studentId: wallet.studentId,
                              limit: currentLimit,
                            ),
                          );
                      Navigator.pop(ctx);
                    },
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BlocListener<GuardianBloc, GuardianState>(
      listener: (context, state) {
        if (state is GuardianChildrenLoaded && state.children.isNotEmpty) {
          if (_selectedChild == null || !state.children.any((c) => c.id == _selectedChild!.id)) {
            final firstChild = state.children.first;
            setState(() => _selectedChild = firstChild);
            context.read<WalletBloc>().add(LoadStudentWalletEvent(firstChild.id));
          }
        }
      },
      child: BlocConsumer<WalletBloc, WalletState>(
        listener: (context, state) {
          if (state is WalletActionSuccessState) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: AppColors.emerald),
            );
          } else if (state is WalletError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: AppColors.rose),
            );
          }
        },
        builder: (context, walletState) {
          return BlocBuilder<GuardianBloc, GuardianState>(
            builder: (context, guardianState) {
              final children = guardianState is GuardianChildrenLoaded ? guardianState.children : <ChildEntity>[];

              return Scaffold(
                appBar: AppBar(
                  title: const Text('Pocket Money & Canteen Wallet', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                  actions: [
                    IconButton(
                      icon: const Icon(LucideIcons.rotateCw, size: 20),
                      onPressed: () {
                        if (_selectedChild != null) {
                          context.read<WalletBloc>().add(LoadStudentWalletEvent(_selectedChild!.id));
                        } else {
                          context.read<GuardianBloc>().add(LoadGuardianChildrenEvent());
                        }
                      },
                    ),
                  ],
                ),
                floatingActionButton: _selectedChild != null
                    ? FloatingActionButton.extended(
                        onPressed: () => _showTopUpDialog(context, _selectedChild!),
                        icon: const Icon(LucideIcons.plus, size: 18, color: Colors.white),
                        label: const Text('Top Up Balance', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                        backgroundColor: AppColors.primary,
                      )
                    : null,
                body: Column(
                  children: [
                    if (children.isNotEmpty)
                      Container(
                        height: 48,
                        margin: const EdgeInsets.symmetric(vertical: 8),
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: children.length,
                          separatorBuilder: (c, i) => const SizedBox(width: 8),
                          itemBuilder: (context, index) {
                            final child = children[index];
                            final isSelected = child.id == _selectedChild?.id;
                            return ChoiceChip(
                              label: Text(child.fullName),
                              selected: isSelected,
                              onSelected: (selected) {
                                if (selected) {
                                  setState(() => _selectedChild = child);
                                  context.read<WalletBloc>().add(LoadStudentWalletEvent(child.id));
                                }
                              },
                              selectedColor: AppColors.primary,
                              labelStyle: TextStyle(
                                color: isSelected ? Colors.white : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                              ),
                            );
                          },
                        ),
                      ),
                    Expanded(
                      child: Builder(
                        builder: (context) {
                          if (walletState is WalletLoading || guardianState is GuardianLoading) {
                            return const Center(child: CircularProgressIndicator());
                          }
                          if (walletState is WalletError) {
                            return Center(child: Text(walletState.message, style: const TextStyle(color: AppColors.rose)));
                          }

                          final wallet = walletState is WalletLoaded ? walletState.wallet : null;

                          return SingleChildScrollView(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.all(24),
                                  decoration: BoxDecoration(
                                    gradient: const LinearGradient(
                                      colors: [Color(0xFF6366F1), Color(0xFF4F46E5)],
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                    ),
                                    borderRadius: BorderRadius.circular(20),
                                    boxShadow: [
                                      BoxShadow(
                                        color: const Color(0xFF4F46E5).withAlpha(80),
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
                                            'DIGITAL SMART WALLET',
                                            style: TextStyle(color: Colors.white.withAlpha(200), fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.2),
                                          ),
                                          const Icon(LucideIcons.wallet, color: Colors.white, size: 22),
                                        ],
                                      ),
                                      const SizedBox(height: 16),
                                      Text(
                                        'GHS ${(wallet?.balance ?? 0.0).toStringAsFixed(2)}',
                                        style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w900),
                                      ),
                                      const SizedBox(height: 8),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            'Daily Cap: GHS ${(wallet?.dailyLimit ?? 50.0).toStringAsFixed(2)}',
                                            style: TextStyle(color: Colors.white.withAlpha(220), fontSize: 12, fontWeight: FontWeight.w600),
                                          ),
                                          if (wallet != null)
                                            InkWell(
                                              onTap: () => _showLimitDialog(context, wallet),
                                              child: Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                decoration: BoxDecoration(
                                                  color: Colors.white.withAlpha(40),
                                                  borderRadius: BorderRadius.circular(8),
                                                ),
                                                child: const Text('Edit Cap', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                                              ),
                                            ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 24),
                                Text(
                                  'RECENT TRANSACTIONS',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 1.2,
                                    color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                if (wallet == null || wallet.transactions.isEmpty)
                                  Center(
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(vertical: 40),
                                      child: Column(
                                        children: [
                                          Icon(LucideIcons.receipt, size: 48, color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                                          const SizedBox(height: 8),
                                          Text('No recent wallet transactions', style: TextStyle(color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted)),
                                        ],
                                      ),
                                    ),
                                  )
                                else
                                  ListView.separated(
                                    shrinkWrap: true,
                                    physics: const NeverScrollableScrollPhysics(),
                                    itemCount: wallet.transactions.length,
                                    separatorBuilder: (c, i) => const SizedBox(height: 10),
                                    itemBuilder: (context, index) {
                                      final tx = wallet.transactions[index];
                                      final isCredit = tx.type.toUpperCase() == 'CREDIT';

                                      return SlCard(
                                        padding: const EdgeInsets.all(14),
                                        child: Row(
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.all(10),
                                              decoration: BoxDecoration(
                                                color: (isCredit ? AppColors.emerald : AppColors.rose).withAlpha(25),
                                                borderRadius: BorderRadius.circular(10),
                                              ),
                                              child: Icon(
                                                isCredit ? LucideIcons.arrowDownLeft : LucideIcons.shoppingBag,
                                                color: isCredit ? AppColors.emerald : AppColors.rose,
                                                size: 20,
                                              ),
                                            ),
                                            const SizedBox(width: 14),
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(tx.description, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                                                  Text(
                                                    DateFormat('MMM d, hh:mm a').format(tx.timestamp),
                                                    style: TextStyle(color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted, fontSize: 11),
                                                  ),
                                                ],
                                              ),
                                            ),
                                            Text(
                                              '${isCredit ? "+" : "-"}GHS ${tx.amount.toStringAsFixed(2)}',
                                              style: TextStyle(
                                                fontWeight: FontWeight.w800,
                                                color: isCredit ? AppColors.emerald : AppColors.rose,
                                                fontSize: 14,
                                              ),
                                            ),
                                          ],
                                        ),
                                      );
                                    },
                                  ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
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
