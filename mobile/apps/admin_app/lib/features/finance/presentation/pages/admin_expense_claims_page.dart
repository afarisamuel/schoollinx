import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/admin_drawer.dart';

class AdminExpenseClaimsPage extends StatelessWidget {
  const AdminExpenseClaimsPage({super.key});

  final List<Map<String, dynamic>> _claims = const [
    {
      'title': 'Science Chemistry Reagents for Lab Practical',
      'claimant': 'Dr. Daniel Darko',
      'amount': 'GH₵ 850.00',
      'date': 'Aug 30',
      'receiptAttached': true,
      'status': 'PENDING_APPROVAL',
    },
    {
      'title': 'Inter-Schools Sports Transport Fuel Voucher',
      'claimant': 'Coach Kofi Boateng',
      'amount': 'GH₵ 420.00',
      'date': 'Aug 28',
      'receiptAttached': true,
      'status': 'APPROVED',
    },
    {
      'title': 'Printer Toner & A4 Ream Replenishment',
      'claimant': 'Admin Office (Sarah)',
      'amount': 'GH₵ 650.00',
      'date': 'Aug 25',
      'receiptAttached': true,
      'status': 'DISBURSED',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const AdminDrawer(currentRoute: '/expenses'),
      appBar: AppBar(
        title: Text(
          'Staff Expense Claims & Vouchers',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: isDark ? Colors.white : const Color(0xFF0F172A),
          ),
        ),
        backgroundColor: isDark ? const Color(0xFF0D1526) : Colors.white,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ..._claims.map((claim) {
            final isPending = claim['status'] == 'PENDING_APPROVAL';
            final isApproved = claim['status'] == 'APPROVED';

            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: SlCard(
                padding: const EdgeInsets.all(16),
                borderRadius: BorderRadius.circular(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            claim['title']!,
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w800,
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                            ),
                          ),
                        ),
                        SlBadge(
                          text: isPending ? 'PENDING' : (isApproved ? 'APPROVED' : 'DISBURSED'),
                          variant: isPending ? SlBadgeVariant.warning : SlBadgeVariant.success,
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Claimant: ${claim['claimant']} • ${claim['date']}',
                          style: TextStyle(fontSize: 11.5, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                        ),
                        Text(
                          claim['amount']!,
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF10B981)),
                        ),
                      ],
                    ),
                    if (isPending) ...[
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF10B981),
                                foregroundColor: Colors.white,
                                elevation: 0,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Expense claim approved!')),
                                );
                              },
                              child: const Text('Approve Voucher', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
                            ),
                          ),
                          const SizedBox(width: 8),
                          OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: const Color(0xFFEF4444),
                              side: const BorderSide(color: Color(0xFFEF4444)),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            onPressed: () {},
                            child: const Text('Reject', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}
