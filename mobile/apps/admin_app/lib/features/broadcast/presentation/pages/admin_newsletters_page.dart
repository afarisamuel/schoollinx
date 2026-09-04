import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/admin_drawer.dart';

class AdminNewslettersPage extends StatelessWidget {
  const AdminNewslettersPage({super.key});

  final List<Map<String, dynamic>> _newsletters = const [
    {
      'title': 'Term 1 Welcome & Academic Calendar 2024/2025',
      'edition': 'Vol. 12 Issue 1',
      'views': 420,
      'delivered': '380 Parents',
      'date': 'Aug 28',
      'status': 'PUBLISHED',
    },
    {
      'title': 'BECE & WASSCE 2024 Results Special Gazette',
      'edition': 'Special Honors Digest',
      'views': 890,
      'delivered': '510 Parents',
      'date': 'Aug 15',
      'status': 'PUBLISHED',
    },
    {
      'title': 'Upcoming Speech & Prize Giving Day Program',
      'edition': 'Vol. 12 Issue 2 (Draft)',
      'views': 0,
      'delivered': '0 (Unsent)',
      'date': 'Sept 1',
      'status': 'DRAFT',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const AdminDrawer(currentRoute: '/newsletters'),
      appBar: AppBar(
        title: Text(
          'Parent Newsletters & Gazette',
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
            icon: Icon(LucideIcons.penSquare, size: 20, color: isDark ? Colors.white : const Color(0xFF0F172A)),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Compose new newsletter circular...')),
              );
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ..._newsletters.map((n) {
            final isPublished = n['status'] == 'PUBLISHED';

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
                            n['title']!,
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w800,
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                            ),
                          ),
                        ),
                        SlBadge(
                          text: n['status']!,
                          variant: isPublished ? SlBadgeVariant.success : SlBadgeVariant.warning,
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${n['edition']} • Published ${n['date']}',
                      style: TextStyle(fontSize: 11.5, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                    ),
                    const Divider(height: 18),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Icon(LucideIcons.eye, size: 14, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                            const SizedBox(width: 4),
                            Text('${n['views']} Views', style: TextStyle(fontSize: 11.5, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B))),
                          ],
                        ),
                        Row(
                          children: [
                            Icon(LucideIcons.send, size: 14, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                            const SizedBox(width: 4),
                            Text('Dispatched: ${n['delivered']}', style: TextStyle(fontSize: 11.5, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B))),
                          ],
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
