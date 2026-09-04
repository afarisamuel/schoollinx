import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/admin_drawer.dart';

class AdminDepartmentsPage extends StatelessWidget {
  const AdminDepartmentsPage({super.key});

  final List<Map<String, dynamic>> _departments = const [
    {'name': 'Mathematics & Computing', 'head': 'Prof. J. K. Adjei', 'teachers': 8, 'courses': 6, 'color': Color(0xFF3B82F6)},
    {'name': 'Science & Technology', 'head': 'Dr. Cynthia Mensah', 'teachers': 12, 'courses': 8, 'color': Color(0xFF10B981)},
    {'name': 'Languages & Literature', 'head': 'Mrs. Angela Forson', 'teachers': 10, 'courses': 5, 'color': Color(0xFF8B5CF6)},
    {'name': 'Business & Economics', 'head': 'Mr. E. N. Amuzu', 'teachers': 6, 'courses': 4, 'color': Color(0xFFF59E0B)},
    {'name': 'Creative Arts & Music', 'head': 'Ms. Abena Kwarteng', 'teachers': 4, 'courses': 3, 'color': Color(0xFFEC4899)},
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const AdminDrawer(currentRoute: '/departments'),
      appBar: AppBar(
        title: Text(
          'Academic Departments',
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
          ..._departments.map((d) {
            final color = d['color'] as Color;

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
                        color: color.withAlpha(isDark ? 50 : 30),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(child: Icon(LucideIcons.network, size: 20, color: color)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            d['name'] as String,
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w800,
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Head: ${d['head']} • ${d['teachers']} Faculty • ${d['courses']} Courses',
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
