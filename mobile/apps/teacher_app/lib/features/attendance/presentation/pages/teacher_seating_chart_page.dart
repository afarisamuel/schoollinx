import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/teacher_drawer.dart';

class TeacherSeatingChartPage extends StatelessWidget {
  const TeacherSeatingChartPage({super.key});

  final List<String> _desks = const [
    'Kofi Darko', 'Ama Mensah', 'Kwabena Asante', 'Sarah Mensah',
    'Emmanuel Appiah', 'Abena Poku', 'David Mensah', 'Grace Addo',
    'Samuel Osei', 'Yaw Boateng', 'Eunice Owusu', 'Kelvin Arthur',
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const TeacherDrawer(currentRoute: '/seating-charts'),
      appBar: AppBar(
        title: Text(
          'Classroom Seating Charts',
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
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDark ? Colors.white.withAlpha(10) : const Color(0xFFE2E8F0),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: Text(
                'TEACHER DESK & CHALKBOARD FRONT',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.2,
                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF475569),
                ),
              ),
            ),
          ),
          const SizedBox(height: 20),

          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 2.2,
            ),
            itemCount: _desks.length,
            itemBuilder: (context, index) {
              final student = _desks[index];

              return SlCard(
                padding: const EdgeInsets.all(10),
                borderRadius: BorderRadius.circular(12),
                child: Row(
                  children: [
                    SlAvatar(
                      initials: student.split(' ').map((n) => n[0]).take(2).join(),
                      size: 32,
                      backgroundColor: AppColors.primary,
                      textColor: Colors.white,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            student,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            'Desk #${index + 1}',
                            style: TextStyle(
                              fontSize: 10,
                              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
