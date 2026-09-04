import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/teacher_drawer.dart';

class TeacherPayslipsPage extends StatelessWidget {
  const TeacherPayslipsPage({super.key});

  final List<Map<String, dynamic>> _payslips = const [
    {
      'month': 'August 2024',
      'gross': 'GH₵ 4,850.00',
      'deductions': 'GH₵ 620.00',
      'net': 'GH₵ 4,230.00',
      'status': 'PAID (Direct Deposit)',
      'disbursedDate': 'Aug 26, 2024',
    },
    {
      'month': 'July 2024',
      'gross': 'GH₵ 4,850.00',
      'deductions': 'GH₵ 620.00',
      'net': 'GH₵ 4,230.00',
      'status': 'PAID (Direct Deposit)',
      'disbursedDate': 'July 26, 2024',
    },
    {
      'month': 'June 2024',
      'gross': 'GH₵ 4,850.00',
      'deductions': 'GH₵ 620.00',
      'net': 'GH₵ 4,230.00',
      'status': 'PAID (Direct Deposit)',
      'disbursedDate': 'June 26, 2024',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const TeacherDrawer(currentRoute: '/payslips'),
      appBar: AppBar(
        title: Text(
          'HR Vault & Salary Payslips',
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
          ..._payslips.map((p) {
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
                            'Payslip - ${p['month']}',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                            ),
                          ),
                        ),
                        const SlBadge(text: 'DISBURSED', variant: SlBadgeVariant.success),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Disbursed on ${p['disbursedDate']} • GCB Bank Accra',
                      style: TextStyle(fontSize: 11.5, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                    ),
                    const Divider(height: 18),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Gross Salary: ${p['gross']}', style: TextStyle(fontSize: 12, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B))),
                        Text('SSNIT / Tax: -${p['deductions']}', style: const TextStyle(fontSize: 12, color: Color(0xFFEF4444), fontWeight: FontWeight.w600)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Net Take-Home Pay:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                        Text(
                          p['net']!,
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF10B981)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        side: const BorderSide(color: AppColors.primary),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        minimumSize: const Size(double.infinity, 38),
                      ),
                      icon: const Icon(LucideIcons.download, size: 14),
                      label: const Text('Download PDF Payslip', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Downloading official PDF payslip for ${p['month']}...')),
                        );
                      },
                    ),
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
