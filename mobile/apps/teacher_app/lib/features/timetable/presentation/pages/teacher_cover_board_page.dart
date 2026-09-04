import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/teacher_drawer.dart';

class TeacherCoverBoardPage extends StatelessWidget {
  const TeacherCoverBoardPage({super.key});

  final List<Map<String, dynamic>> _coverRequests = const [
    {
      'teacher': 'Mr. Joseph Boateng (On Medical Leave)',
      'subject': 'Integrated Science • Form 1A',
      'period': 'Period 3 (10:30 - 11:15 AM)',
      'room': 'Block A - 101',
      'coverStatus': 'ASSIGNED_TO_YOU',
      'lessonMaterial': 'Attached Worksheet on Plant Cells',
    },
    {
      'teacher': 'Mrs. Angela Forson (CPD Workshop)',
      'subject': 'English Grammar • JHS 2',
      'period': 'Period 5 (01:15 - 02:00 PM)',
      'room': 'Block B - 204',
      'coverStatus': 'OPEN_FOR_VOLUNTEER',
      'lessonMaterial': 'Comprehension Reading Passage 4',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const TeacherDrawer(currentRoute: '/cover-board'),
      appBar: AppBar(
        title: Text(
          'Faculty Cover Board & Relief',
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
          ..._coverRequests.map((r) {
            final isAssigned = r['coverStatus'] == 'ASSIGNED_TO_YOU';

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
                            r['subject']!,
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w800,
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                            ),
                          ),
                        ),
                        SlBadge(
                          text: isAssigned ? 'ASSIGNED TO YOU' : 'OPEN RELIEF',
                          variant: isAssigned ? SlBadgeVariant.warning : SlBadgeVariant.primary,
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      r['teacher']!,
                      style: TextStyle(fontSize: 11.5, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                    ),
                    const Divider(height: 18),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(LucideIcons.clock, size: 14, color: AppColors.primary),
                            const SizedBox(width: 4),
                            Text(r['period']!, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700)),
                          ],
                        ),
                        Text(r['room']!, style: TextStyle(fontSize: 11, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B))),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Material: ${r['lessonMaterial']}',
                      style: TextStyle(fontSize: 11, color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155)),
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
