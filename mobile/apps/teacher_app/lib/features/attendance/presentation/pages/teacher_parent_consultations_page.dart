import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/teacher_drawer.dart';

class TeacherParentConsultationsPage extends StatelessWidget {
  const TeacherParentConsultationsPage({super.key});

  final List<Map<String, dynamic>> _consultations = const [
    {
      'parent': 'Mrs. Elizabeth Darko',
      'student': 'Kofi Darko (Primary 4B)',
      'time': 'Today, 2:30 PM',
      'mode': 'In-Person (Staff Room)',
      'topic': 'Mathematics Progress & Homework Consistency',
      'status': 'CONFIRMED',
    },
    {
      'parent': 'Mr. Samuel Mensah',
      'student': 'Ama Mensah (JHS 2)',
      'time': 'Tomorrow, 10:00 AM',
      'mode': 'Phone Call (+233 20 998 7766)',
      'topic': 'Science Practical Project Guidance',
      'status': 'REQUESTED',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const TeacherDrawer(currentRoute: '/parent-consultations'),
      appBar: AppBar(
        title: Text(
          'Parent Consultations & PTA',
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
          ..._consultations.map((c) {
            final isConfirmed = c['status'] == 'CONFIRMED';

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
                            c['parent']!,
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w800,
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                            ),
                          ),
                        ),
                        SlBadge(
                          text: c['status']!,
                          variant: isConfirmed ? SlBadgeVariant.success : SlBadgeVariant.warning,
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Ward: ${c['student']}',
                      style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: AppColors.primary),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Agenda: ${c['topic']}',
                      style: TextStyle(fontSize: 12, color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155)),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(LucideIcons.clock, size: 14, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                        const SizedBox(width: 4),
                        Text(c['time']!, style: TextStyle(fontSize: 11, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B))),
                        const Spacer(),
                        Text(c['mode']!, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
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
