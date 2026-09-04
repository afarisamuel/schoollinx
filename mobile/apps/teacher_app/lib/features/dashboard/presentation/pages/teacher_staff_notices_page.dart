import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/teacher_drawer.dart';

class TeacherStaffNoticesPage extends StatelessWidget {
  const TeacherStaffNoticesPage({super.key});

  final List<Map<String, dynamic>> _notices = const [
    {
      'title': 'Mandatory Staff Meeting on Midterm Exams Moderation',
      'author': 'Headmaster',
      'date': 'Today, 08:30 AM',
      'message': 'All academic staff are requested to assemble in the Main Auditorium at 3:30 PM today for the examination moderation exercise.',
      'priority': 'HIGH',
    },
    {
      'title': 'Continuous Professional Development (CPD) Workshop',
      'author': 'Academic Registrar',
      'date': 'Yesterday',
      'message': 'Session on Digital Hybrid Classrooms and AI Assessment tools takes place this Saturday on Zoom.',
      'priority': 'NORMAL',
    },
    {
      'title': 'Submission of Week 4 Lesson Notes Deadline',
      'author': 'Dean of Studies',
      'date': 'Aug 29',
      'message': 'Reminder to submit all Week 4 lesson notes via the Lesson Planner portal by Friday 5:00 PM.',
      'priority': 'NORMAL',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const TeacherDrawer(currentRoute: '/staff-notices'),
      appBar: AppBar(
        title: Text(
          'Staff Room Circulars & Notices',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: isDark ? Colors.white : const Color(0xFF0F172A),
          ),
        ),
        backgroundColor: isDark ? const Color(0xFF0D1526) : Colors.white,
        elevation: 0,
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _notices.length,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final n = _notices[index];
          final isHigh = n['priority'] == 'HIGH';

          return SlCard(
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
                      text: n['priority']!,
                      variant: isHigh ? SlBadgeVariant.warning : SlBadgeVariant.primary,
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'From: ${n['author']} • ${n['date']}',
                  style: TextStyle(fontSize: 11, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                ),
                const SizedBox(height: 8),
                Text(
                  n['message']!,
                  style: TextStyle(
                    fontSize: 12.5,
                    height: 1.4,
                    color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
