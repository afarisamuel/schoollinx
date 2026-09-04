import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/admin_drawer.dart';

class AdminAssetsPage extends StatelessWidget {
  const AdminAssetsPage({super.key});

  final List<Map<String, dynamic>> _assets = const [
    {'tag': 'AST-2024-001', 'name': 'Toyota Coaster 32-Seater Bus (Fleet #1)', 'category': 'Vehicles', 'status': 'ACTIVE', 'value': 'GH₵ 420,000'},
    {'tag': 'AST-2024-042', 'name': 'Perkins 150kVA Standby Generator', 'category': 'Power & Utilities', 'status': 'OPERATIONAL', 'value': 'GH₵ 95,000'},
    {'tag': 'AST-2024-110', 'name': 'Smart Interactive Whiteboards (x12)', 'category': 'ICT Equipment', 'status': 'DEPLOYED', 'value': 'GH₵ 78,000'},
    {'tag': 'AST-2024-205', 'name': 'Olympus Optical Lab Microscopes (x25)', 'category': 'Lab Instruments', 'status': 'DEPLOYED', 'value': 'GH₵ 35,000'},
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const AdminDrawer(currentRoute: '/assets'),
      appBar: AppBar(
        title: Text(
          'Asset Management & Inventory',
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
          ..._assets.map((a) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: SlCard(
                padding: const EdgeInsets.all(14),
                borderRadius: BorderRadius.circular(16),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: const Color(0xFF3B82F6).withAlpha(isDark ? 50 : 30),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Center(child: Icon(LucideIcons.boxes, size: 18, color: Color(0xFF3B82F6))),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              SlBadge(text: a['tag']!, variant: SlBadgeVariant.primary),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  a['name']!,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w800,
                                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(
                            '${a['category']} • Est. Value: ${a['value']}',
                            style: TextStyle(fontSize: 11, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ),
                    const SlBadge(text: 'ACTIVE', variant: SlBadgeVariant.success),
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
