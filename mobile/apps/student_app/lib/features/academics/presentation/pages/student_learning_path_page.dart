import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/student_drawer.dart';

class StudentLearningPathPage extends StatelessWidget {
  const StudentLearningPathPage({super.key});

  final List<Map<String, dynamic>> _topics = const [
    {
      'subject': 'Core Mathematics',
      'chapter': 'Chapter 4: Linear Inequalities & Set Theory',
      'progress': 0.85,
      'status': 'ALMOST_COMPLETE',
      'color': Color(0xFF3B82F6),
      'badgesEarned': 3,
    },
    {
      'subject': 'Integrated Science',
      'chapter': 'Chapter 3: Chemical Bonding & Periodic Table',
      'progress': 0.60,
      'status': 'IN_PROGRESS',
      'color': Color(0xFF10B981),
      'badgesEarned': 2,
    },
    {
      'subject': 'Computing & ICT',
      'chapter': 'Chapter 2: Algorithms & Flowchart Design',
      'progress': 1.0,
      'status': 'MASTERED',
      'color': Color(0xFF8B5CF6),
      'badgesEarned': 4,
    },
    {
      'subject': 'English Language',
      'chapter': 'Chapter 5: Narrative Essay Writing & Idioms',
      'progress': 0.40,
      'status': 'IN_PROGRESS',
      'color': Color(0xFFF59E0B),
      'badgesEarned': 1,
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const StudentDrawer(currentRoute: '/learning-path'),
      appBar: AppBar(
        title: Text(
          'My Learning Path & Mastery',
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
          // Banner
          SlCard(
            padding: const EdgeInsets.all(16),
            borderRadius: BorderRadius.circular(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF6366F1), Color(0xFF3B82F6)],
                    ),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(LucideIcons.zap, size: 28, color: Colors.white),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Term 1 Syllabus Mastery',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: isDark ? Colors.white : const Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '71% overall curriculum completion across all 6 core subjects.',
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
            'SUBJECT CHAPTER PROGRESS',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.1,
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 12),

          ..._topics.map((t) {
            final color = t['color'] as Color;
            final progress = t['progress'] as double;
            final isMastered = t['status'] == 'MASTERED';

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
                        SlBadge(text: t['subject'] as String, variant: SlBadgeVariant.primary),
                        const Spacer(),
                        if (isMastered)
                          const SlBadge(text: 'MASTERED', variant: SlBadgeVariant.success)
                        else
                          Text(
                            '${(progress * 100).toInt()}% Done',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: color),
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      t['chapter'] as String,
                      style: TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w800,
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: LinearProgressIndicator(
                        value: progress,
                        minHeight: 8,
                        backgroundColor: isDark ? Colors.white.withAlpha(20) : const Color(0xFFE2E8F0),
                        valueColor: AlwaysStoppedAnimation<Color>(color),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(LucideIcons.award, size: 14, color: Color(0xFFF59E0B)),
                            const SizedBox(width: 4),
                            Text(
                              '${t['badgesEarned']} Mastery Badges',
                              style: TextStyle(fontSize: 11, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B), fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Starting lesson modules for ${t['chapter']}...')),
                            );
                          },
                          child: const Text('Continue Study', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
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
