import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/teacher_drawer.dart';

class TeacherLessonPlannerPage extends StatelessWidget {
  const TeacherLessonPlannerPage({super.key});

  final List<Map<String, dynamic>> _plans = const [
    {
      'subject': 'Core Mathematics',
      'class': 'Form 1A',
      'topic': 'Quadratic Equations & Parabolic Graphs',
      'week': 'Week 3 • Term 1',
      'objectives': 'Derive roots using formula and plot coordinates.',
      'status': 'APPROVED',
      'color': Color(0xFF3B82F6),
    },
    {
      'subject': 'Integrated Science',
      'class': 'JHS 2 Science',
      'topic': 'Photosynthesis & Light Reactions in C3 Plants',
      'week': 'Week 3 • Term 1',
      'objectives': 'Conduct iodine starch test with variegated leaves.',
      'status': 'DRAFT',
      'color': Color(0xFF10B981),
    },
    {
      'subject': 'Core Mathematics',
      'class': 'Form 2B',
      'topic': 'Trigonometric Ratios & Angles of Elevation',
      'week': 'Week 4 • Term 1',
      'objectives': 'Apply Sine, Cosine, and Tangent to real world heights.',
      'status': 'UNDER_REVIEW',
      'color': Color(0xFF8B5CF6),
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const TeacherDrawer(currentRoute: '/lesson-planner'),
      appBar: AppBar(
        title: Text(
          'Lesson Planner & Curriculum',
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
                const SnackBar(content: Text('Create new lesson plan...')),
              );
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ..._plans.map((p) {
            final isApproved = p['status'] == 'APPROVED';
            final isDraft = p['status'] == 'DRAFT';

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
                        SlBadge(text: p['subject']!, variant: SlBadgeVariant.primary),
                        const SizedBox(width: 8),
                        Text(
                          p['class']!,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                          ),
                        ),
                        const Spacer(),
                        SlBadge(
                          text: p['status']!,
                          variant: isApproved ? SlBadgeVariant.success : (isDraft ? SlBadgeVariant.primary : SlBadgeVariant.warning),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      p['topic']!,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Objectives: ${p['objectives']}',
                      style: TextStyle(fontSize: 11.5, color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155)),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      p['week']!,
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary),
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
