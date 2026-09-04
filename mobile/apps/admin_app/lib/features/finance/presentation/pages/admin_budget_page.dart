import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/admin_drawer.dart';

class AdminBudgetPage extends StatelessWidget {
  const AdminBudgetPage({super.key});

  final List<Map<String, dynamic>> _budgets = const [
    {
      'department': 'Science & Computer Labs',
      'allocated': 'GH₵ 85,000.00',
      'spent': 'GH₵ 52,400.00',
      'ratio': 0.61,
      'color': Color(0xFF3B82F6),
    },
    {
      'department': 'Campus Facilities & Maintenance',
      'allocated': 'GH₵ 120,000.00',
      'spent': 'GH₵ 94,800.00',
      'ratio': 0.79,
      'color': Color(0xFFF59E0B),
    },
    {
      'department': 'Sports & Cadet Operations',
      'allocated': 'GH₵ 35,000.00',
      'spent': 'GH₵ 14,200.00',
      'ratio': 0.40,
      'color': Color(0xFF10B981),
    },
    {
      'department': 'Library & Textbooks Fund',
      'allocated': 'GH₵ 40,000.00',
      'spent': 'GH₵ 38,100.00',
      'ratio': 0.95,
      'color': Color(0xFFEF4444),
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const AdminDrawer(currentRoute: '/budget-planning'),
      appBar: AppBar(
        title: Text(
          'Budget Planning & Allocations',
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
          SlCard(
            padding: const EdgeInsets.all(16),
            borderRadius: BorderRadius.circular(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF8B5CF6).withAlpha(isDark ? 50 : 30),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(LucideIcons.pieChart, size: 28, color: Color(0xFF8B5CF6)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'FY 2024/2025 Fiscal Master',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: isDark ? Colors.white : const Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Total Approved Budget: GH₵ 680,000.00 (Burn rate 67.2%)',
                        style: TextStyle(
                          fontSize: 11.5,
                          color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          Text(
            'DEPARTMENTAL BUDGET LINES',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.1,
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 12),

          ..._budgets.map((b) {
            final color = b['color'] as Color;
            final ratio = b['ratio'] as double;

            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: SlCard(
                padding: const EdgeInsets.all(16),
                borderRadius: BorderRadius.circular(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            b['department'] as String,
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w800,
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                            ),
                          ),
                        ),
                        Text(
                          '${(ratio * 100).toInt()}% Spent',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: color),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: LinearProgressIndicator(
                        value: ratio,
                        minHeight: 8,
                        backgroundColor: isDark ? Colors.white.withAlpha(20) : const Color(0xFFE2E8F0),
                        valueColor: AlwaysStoppedAnimation<Color>(color),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Spent: ${b['spent']}',
                          style: TextStyle(fontSize: 11.5, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B), fontWeight: FontWeight.w600),
                        ),
                        Text(
                          'Cap: ${b['allocated']}',
                          style: TextStyle(fontSize: 11.5, color: isDark ? Colors.white : const Color(0xFF0F172A), fontWeight: FontWeight.w700),
                        ),
                      ],
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
