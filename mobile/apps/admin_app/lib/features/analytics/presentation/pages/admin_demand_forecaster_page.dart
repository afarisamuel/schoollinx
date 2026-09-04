import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/admin_drawer.dart';

class AdminDemandForecasterPage extends StatelessWidget {
  const AdminDemandForecasterPage({super.key});

  final List<Map<String, dynamic>> _predictions = const [
    {
      'course': 'Computing & Digital Literacy (SHS 1)',
      'currentEnrollment': 120,
      'predictedDemand': 175,
      'change': '+45.8%',
      'color': Color(0xFF10B981),
      'action': 'Allocate 1 Additional Lab Period',
    },
    {
      'course': 'Science & Applied Physics (JHS 2)',
      'currentEnrollment': 90,
      'predictedDemand': 110,
      'change': '+22.2%',
      'color': Color(0xFF3B82F6),
      'action': 'Classroom Capacity Adequate',
    },
    {
      'course': 'Elective French & Foreign Languages',
      'currentEnrollment': 65,
      'predictedDemand': 48,
      'change': '-26.1%',
      'color': Color(0xFFF59E0B),
      'action': 'Merge into 2 Combined Streams',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const AdminDrawer(currentRoute: '/demand-forecaster'),
      appBar: AppBar(
        title: Text(
          'Course Demand Forecaster',
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
          SlCard(
            padding: const EdgeInsets.all(16),
            borderRadius: BorderRadius.circular(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF6366F1).withAlpha(isDark ? 50 : 30),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(LucideIcons.lineChart, size: 28, color: Color(0xFF6366F1)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'AI Capacity & Enrollment Forecast',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: isDark ? Colors.white : const Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Predicts enrollment demand for next term using multi-year enrollment telemetry.',
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
            'ENROLLMENT PROJECTIONS & LAB ALLOCATIONS',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.1,
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 12),

          ..._predictions.map((p) {
            final color = p['color'] as Color;

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
                            p['course'] as String,
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w800,
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                            ),
                          ),
                        ),
                        Text(
                          p['change'] as String,
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: color),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Current: ${p['currentEnrollment']} students', style: TextStyle(fontSize: 12, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B))),
                        Text('Forecast: ${p['predictedDemand']} seats', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white.withAlpha(10) : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(LucideIcons.sparkles, size: 14, color: Color(0xFF6366F1)),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              p['action'] as String,
                              style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155)),
                            ),
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
