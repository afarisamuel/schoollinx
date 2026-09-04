import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/parent_drawer.dart';

class ParentBadgesPage extends StatelessWidget {
  const ParentBadgesPage({super.key});

  final List<Map<String, dynamic>> _badges = const [
    {
      'title': 'Science Fair Innovator Gold',
      'category': 'Academic Honor',
      'date': 'Awarded Aug 2024',
      'icon': LucideIcons.award,
      'color': Color(0xFFF59E0B),
      'points': '+50 pts',
    },
    {
      'title': '100% Term Attendance Ribbon',
      'category': 'Punctuality',
      'date': 'Awarded July 2024',
      'icon': LucideIcons.calendarCheck,
      'color': Color(0xFF10B981),
      'points': '+30 pts',
    },
    {
      'title': 'Spelling & Vocabulary Master',
      'category': 'Languages',
      'date': 'Awarded June 2024',
      'icon': LucideIcons.bookOpen,
      'color': Color(0xFF3B82F6),
      'points': '+20 pts',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const ParentDrawer(currentRoute: '/badges'),
      appBar: AppBar(
        title: Text(
          'Merit Badges & Achievements',
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
          ..._badges.map((b) {
            final color = b['color'] as Color;

            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: SlCard(
                padding: const EdgeInsets.all(16),
                borderRadius: BorderRadius.circular(16),
                child: Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: color.withAlpha(isDark ? 50 : 30),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Center(
                        child: Icon(b['icon'] as IconData, size: 24, color: color),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  b['title'] as String,
                                  style: TextStyle(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w800,
                                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                                  ),
                                ),
                              ),
                              Text(
                                b['points'] as String,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w900,
                                  color: color,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(
                            '${b['category']} • ${b['date']}',
                            style: TextStyle(fontSize: 11, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
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
