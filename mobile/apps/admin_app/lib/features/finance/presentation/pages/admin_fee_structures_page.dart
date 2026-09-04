import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/admin_drawer.dart';

class AdminFeeStructuresPage extends StatelessWidget {
  const AdminFeeStructuresPage({super.key});

  final List<Map<String, dynamic>> _tariffs = const [
    {
      'grade': 'Junior High School (JHS 1 - 3)',
      'tuition': 'GH₵ 2,400.00',
      'pta': 'GH₵ 150.00',
      'ict': 'GH₵ 200.00',
      'total': 'GH₵ 2,750.00',
      'term': 'Term 1 (2024/2025)',
    },
    {
      'grade': 'Primary (Classes 1 - 6)',
      'tuition': 'GH₵ 1,800.00',
      'pta': 'GH₵ 150.00',
      'ict': 'GH₵ 150.00',
      'total': 'GH₵ 2,100.00',
      'term': 'Term 1 (2024/2025)',
    },
    {
      'grade': 'Kindergarten & Nursery',
      'tuition': 'GH₵ 1,500.00',
      'pta': 'GH₵ 100.00',
      'ict': 'GH₵ 100.00',
      'total': 'GH₵ 1,700.00',
      'term': 'Term 1 (2024/2025)',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const AdminDrawer(currentRoute: '/fee-structures'),
      appBar: AppBar(
        title: Text(
          'Fee Structures & Bills',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: isDark ? Colors.white : const Color(0xFF0F172A),
          ),
        ),
        backgroundColor: isDark ? const Color(0xFF0D1526) : Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(LucideIcons.plus, size: 20, color: isDark ? Colors.white : const Color(0xFF0F172A)),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Create fee tariff modal')),
              );
            },
          ),
        ],
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
                    color: const Color(0xFFF59E0B).withAlpha(isDark ? 50 : 30),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(LucideIcons.receipt, size: 28, color: Color(0xFFF59E0B)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Termly Billing Master',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: isDark ? Colors.white : const Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Define mandatory and elective fee items billed automatically to guardians.',
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
            'ACTIVE FEE STRUCTURES',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.1,
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 12),

          ..._tariffs.map((t) {
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
                            t['grade']!,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                            ),
                          ),
                        ),
                        const SlBadge(text: 'ACTIVE', variant: SlBadgeVariant.success),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      t['term']!,
                      style: TextStyle(fontSize: 11.5, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                    ),
                    const Divider(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Tuition & Exams:', style: TextStyle(fontSize: 12, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B))),
                        Text(t['tuition']!, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('PTA Levy & Development:', style: TextStyle(fontSize: 12, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B))),
                        Text(t['pta']!, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('ICT & Lab Practical:', style: TextStyle(fontSize: 12, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B))),
                        Text(t['ict']!, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF59E0B).withAlpha(isDark ? 30 : 15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Total Term Bill:', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800)),
                          Text(
                            t['total']!,
                            style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFFD97706)),
                          ),
                        ],
                      ),
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
