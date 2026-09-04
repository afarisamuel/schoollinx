import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/admin_drawer.dart';

class AdminHrPoliciesPage extends StatelessWidget {
  const AdminHrPoliciesPage({super.key});

  final List<Map<String, dynamic>> _policies = const [
    {'title': 'Faculty Annual & Maternity Leave Regulations 2024', 'size': '1.8 MB', 'date': 'Jan 2024'},
    {'title': 'Child Safeguarding & Student Protection Code of Conduct', 'size': '2.4 MB', 'date': 'Feb 2024'},
    {'title': 'Teachers Continuous Professional Development (CPD) Scheme', 'size': '1.2 MB', 'date': 'May 2024'},
    {'title': 'Disciplinary Protocol & Fair Hearing Procedures', 'size': '980 KB', 'date': 'Aug 2024'},
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const AdminDrawer(currentRoute: '/hr-policies'),
      appBar: AppBar(
        title: Text(
          'HR & Faculty Policies',
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
          ..._policies.map((p) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: SlCard(
                padding: const EdgeInsets.all(14),
                borderRadius: BorderRadius.circular(16),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: const Color(0xFF8B5CF6).withAlpha(isDark ? 50 : 30),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Center(child: Icon(LucideIcons.fileText, size: 18, color: Color(0xFF8B5CF6))),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            p['title']!,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Published: ${p['date']} • ${p['size']}',
                            style: TextStyle(fontSize: 11, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(LucideIcons.download, size: 18, color: AppColors.primary),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Downloading "${p['title']}"...')),
                        );
                      },
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
