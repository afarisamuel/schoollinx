import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/admin_drawer.dart';

class AdminAcademicHubPage extends StatefulWidget {
  const AdminAcademicHubPage({super.key});

  @override
  State<AdminAcademicHubPage> createState() => _AdminAcademicHubPageState();
}

class _AdminAcademicHubPageState extends State<AdminAcademicHubPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final List<Map<String, dynamic>> _streams = [
    {'name': 'JHS 1 General', 'students': 48, 'classTeacher': 'Mr. Kwame Mensah', 'room': 'Block A - 101'},
    {'name': 'JHS 2 Science & Tech', 'students': 45, 'classTeacher': 'Mrs. Sarah Owusu', 'room': 'Block A - 102'},
    {'name': 'JHS 3 Exam Class', 'students': 52, 'classTeacher': 'Dr. Daniel Darko', 'room': 'Block A - 103'},
    {'name': 'SHS 1 General Arts', 'students': 60, 'classTeacher': 'Ms. Abena Kwarteng', 'room': 'Block B - 201'},
    {'name': 'SHS 2 Science', 'students': 58, 'classTeacher': 'Mr. Joseph Boateng', 'room': 'Science Annex 1'},
  ];

  final List<Map<String, dynamic>> _courses = [
    {'code': 'MTH-101', 'name': 'Core Mathematics', 'dept': 'Mathematics', 'units': 4, 'head': 'Prof. J. K. Adjei'},
    {'code': 'SCI-102', 'name': 'Integrated Science', 'dept': 'Science', 'units': 4, 'head': 'Dr. Cynthia Mensah'},
    {'code': 'ENG-103', 'name': 'English Language & Literature', 'dept': 'Languages', 'units': 4, 'head': 'Mrs. Angela Forson'},
    {'code': 'ICT-104', 'name': 'Computing & Digital Literacy', 'dept': 'Technology', 'units': 3, 'head': 'Mr. Emmanuel Antwi'},
    {'code': 'SOC-105', 'name': 'Social Studies & Civics', 'dept': 'Humanities', 'units': 3, 'head': 'Mr. Frank Osei'},
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const AdminDrawer(currentRoute: '/academic-hub'),
      appBar: AppBar(
        title: Text(
          'Academic Hub & Curriculum',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: isDark ? Colors.white : const Color(0xFF0F172A),
          ),
        ),
        backgroundColor: isDark ? const Color(0xFF0D1526) : Colors.white,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
          indicatorColor: AppColors.primary,
          indicatorWeight: 3,
          labelStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
          tabs: const [
            Tab(text: 'Classes & Streams'),
            Tab(text: 'Course Catalog'),
            Tab(text: 'Exam Policies'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildClassesView(isDark),
          _buildCoursesView(isDark),
          _buildExamPoliciesView(isDark),
        ],
      ),
    );
  }

  Widget _buildClassesView(bool isDark) {
    return ListView(
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
                  color: const Color(0xFF8B5CF6).withAlpha(isDark ? 50 : 30),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(LucideIcons.school, size: 28, color: Color(0xFF8B5CF6)),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Active Class Streams',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Manage class rosters, assigned homeroom tutors, and room capacity.',
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

        ..._streams.map((stream) {
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
                      color: const Color(0xFF8B5CF6).withAlpha(isDark ? 50 : 30),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Center(child: Icon(LucideIcons.users, size: 20, color: Color(0xFF8B5CF6))),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          stream['name'],
                          style: TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w800,
                            color: isDark ? Colors.white : const Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Class Teacher: ${stream['classTeacher']} • ${stream['room']}',
                          style: TextStyle(
                            fontSize: 11.5,
                            color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.white.withAlpha(10) : const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '${stream['students']} Pupils',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildCoursesView(bool isDark) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        ..._courses.map((course) {
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
                      color: const Color(0xFF3B82F6).withAlpha(isDark ? 50 : 30),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Center(child: Icon(LucideIcons.bookOpen, size: 20, color: Color(0xFF3B82F6))),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            SlBadge(text: course['code'], variant: SlBadgeVariant.primary),
                            const SizedBox(width: 8),
                            Text(
                              course['name'],
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                                color: isDark ? Colors.white : const Color(0xFF0F172A),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${course['dept']} Department • Lead: ${course['head']}',
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    '${course['units']} Cr',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildExamPoliciesView(bool isDark) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        SlCard(
          padding: const EdgeInsets.all(16),
          borderRadius: BorderRadius.circular(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SlBadge(text: 'ACADEMIC GRADING SCALE', variant: SlBadgeVariant.success),
              const SizedBox(height: 12),
              Text(
                'WAEC / BECE Standard 9-Point Grading Scheme',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Continuous Assessment (30%) + Terminal Examination (70%). Passing threshold set to Grade 6 (50%+).',
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
