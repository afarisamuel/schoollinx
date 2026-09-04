import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/teacher_drawer.dart';

class TeacherConductMeritsPage extends StatelessWidget {
  const TeacherConductMeritsPage({super.key});

  final List<Map<String, dynamic>> _records = const [
    {
      'student': 'Kofi Darko (Primary 4B)',
      'type': 'MERIT',
      'points': '+15 pts',
      'reason': 'Outstanding Science Fair Project Demonstration',
      'house': 'Aggrey House',
      'date': 'Today, 11:30 AM',
    },
    {
      'student': 'Ama Mensah (JHS 2)',
      'type': 'MERIT',
      'points': '+10 pts',
      'reason': 'Volunteered to clean Computer Lab workstations',
      'house': 'Gbewaa House',
      'date': 'Yesterday',
    },
    {
      'student': 'Kwabena Asante (SHS 1)',
      'type': 'INFRACTION',
      'points': '-5 pts',
      'reason': 'Late arrival to Morning Assembly roll call',
      'house': 'Nkrumah House',
      'date': 'Aug 29',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const TeacherDrawer(currentRoute: '/conduct-merits'),
      appBar: AppBar(
        title: Text(
          'Student Conduct & House Merits',
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
            icon: Icon(LucideIcons.award, size: 20, color: isDark ? Colors.white : const Color(0xFF0F172A)),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Award Merit / Infraction modal...')),
              );
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ..._records.map((r) {
            final isMerit = r['type'] == 'MERIT';

            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: SlCard(
                padding: const EdgeInsets.all(14),
                borderRadius: BorderRadius.circular(16),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: (isMerit ? const Color(0xFF10B981) : const Color(0xFFEF4444)).withAlpha(isDark ? 50 : 30),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Icon(
                          isMerit ? LucideIcons.star : LucideIcons.alertCircle,
                          size: 20,
                          color: isMerit ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  r['student']!,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w800,
                                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                                  ),
                                ),
                              ),
                              Text(
                                r['points']!,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w900,
                                  color: isMerit ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            r['reason']!,
                            style: TextStyle(fontSize: 11.5, color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155)),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${r['house']} • ${r['date']}',
                            style: TextStyle(fontSize: 10.5, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
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
