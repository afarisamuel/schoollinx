import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/teacher_drawer.dart';

class TeacherCbtBuilderPage extends StatelessWidget {
  const TeacherCbtBuilderPage({super.key});

  final List<Map<String, dynamic>> _quizzes = const [
    {
      'title': 'Form 1 Mathematics Mid-Term Quiz 1',
      'questions': 25,
      'duration': '40 Mins',
      'class': 'Form 1A',
      'submissions': 42,
      'status': 'ACTIVE',
    },
    {
      'title': 'Photosynthesis & Plant Biology Practice Test',
      'questions': 20,
      'duration': '30 Mins',
      'class': 'JHS 2 Science',
      'submissions': 38,
      'status': 'GRADED',
    },
    {
      'title': 'WASSCE Mock 1: Section A Multiple Choice',
      'questions': 50,
      'duration': '60 Mins',
      'class': 'SHS 3 Science',
      'submissions': 0,
      'status': 'SCHEDULED',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const TeacherDrawer(currentRoute: '/cbt-builder'),
      appBar: AppBar(
        title: Text(
          'CBT Assessment & Quiz Builder',
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
                const SnackBar(content: Text('New CBT Quiz Creator modal...')),
              );
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ..._quizzes.map((q) {
            final isActive = q['status'] == 'ACTIVE';
            final isGraded = q['status'] == 'GRADED';

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
                            q['title'] as String,
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w800,
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                            ),
                          ),
                        ),
                        SlBadge(
                          text: q['status'] as String,
                          variant: isActive ? SlBadgeVariant.success : (isGraded ? SlBadgeVariant.primary : SlBadgeVariant.warning),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Text(
                          '${q['class']} • ${q['questions']} Questions • ${q['duration']}',
                          style: TextStyle(fontSize: 11.5, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${q['submissions']} Student Submissions',
                          style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: AppColors.primary),
                        ),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          icon: const Icon(LucideIcons.edit3, size: 12),
                          label: const Text('Manage Questions', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Opening CBT editor for ${q['title']}')),
                            );
                          },
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
