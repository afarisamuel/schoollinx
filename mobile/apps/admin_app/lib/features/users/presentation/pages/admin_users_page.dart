import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/admin_drawer.dart';

class AdminUsersPage extends StatefulWidget {
  const AdminUsersPage({super.key});

  @override
  State<AdminUsersPage> createState() => _AdminUsersPageState();
}

class _AdminUsersPageState extends State<AdminUsersPage> {
  int _selectedTab = 0; // 0 = Students, 1 = Faculty
  final _searchController = TextEditingController();
  bool _isLoading = true;

  List<StudentEntity> _students = [];
  List<TeacherEntity> _teachers = [];
  List<AcademicClassEntity> _classes = [];
  String? _selectedClassId;

  @override
  void initState() {
    super.initState();
    _loadData();
    _searchController.addListener(() => setState(() {}));
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final academicRepo = sl<AcademicRepository>();

    final classesRes = await academicRepo.getClasses();
    final studentsRes = await academicRepo.getAllStudents();
    final teachersRes = await academicRepo.getAllTeachers();

    if (mounted) {
      setState(() {
        _classes = classesRes.fold((_) => [], (data) => data);
        _students = studentsRes.fold((_) => [], (data) => data);
        _teachers = teachersRes.fold((_) => [], (data) => data);
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<StudentEntity> get _filteredStudents {
    final query = _searchController.text.trim().toLowerCase();
    return _students.where((s) {
      final matchesQuery = query.isEmpty ||
          s.fullName.toLowerCase().contains(query) ||
          (s.enrollmentNum?.toLowerCase().contains(query) ?? false);
      final matchesClass = _selectedClassId == null || s.classId == _selectedClassId;
      return matchesQuery && matchesClass;
    }).toList();
  }

  List<TeacherEntity> get _filteredTeachers {
    final query = _searchController.text.trim().toLowerCase();
    return _teachers.where((t) {
      final subjectsJoined = t.subjects.join(' ').toLowerCase();
      return query.isEmpty ||
          t.fullName.toLowerCase().contains(query) ||
          (t.role?.toLowerCase().contains(query) ?? false) ||
          subjectsJoined.contains(query);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      drawer: const AdminDrawer(currentRoute: '/users'),
      appBar: AppBar(
        title: const Text('Directory & Users', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, size: 18),
            tooltip: 'Refresh Data',
            onPressed: _loadData,
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Search Bar & Tab Toggle
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Column(
                children: [
                  SlInput(
                    controller: _searchController,
                    hintText: _selectedTab == 0 ? 'Search students by name or roll number...' : 'Search teachers...',
                    prefixIcon: const Icon(LucideIcons.search, size: 18),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: SlButton(
                          text: 'Students (${_students.length})',
                          height: 40,
                          borderRadius: 12,
                          variant: _selectedTab == 0 ? SlButtonVariant.primary : SlButtonVariant.secondary,
                          onPressed: () => setState(() => _selectedTab = 0),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: SlButton(
                          text: 'Faculty (${_teachers.length})',
                          height: 40,
                          borderRadius: 12,
                          variant: _selectedTab == 1 ? SlButtonVariant.primary : SlButtonVariant.secondary,
                          onPressed: () => setState(() => _selectedTab = 1),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Class filters for students
            if (_selectedTab == 0 && _classes.isNotEmpty)
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: Row(
                  children: [
                    FilterChip(
                      label: const Text('All Classes', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                      selected: _selectedClassId == null,
                      onSelected: (_) => setState(() => _selectedClassId = null),
                      backgroundColor: isDark ? AppColors.darkCardBg : AppColors.lightCardBg,
                      selectedColor: AppColors.primary.withAlpha(40),
                      checkmarkColor: AppColors.primaryLight,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                        side: BorderSide(
                          color: _selectedClassId == null ? AppColors.primary : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ..._classes.map((c) {
                      final isSelected = _selectedClassId == c.id;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: FilterChip(
                          label: Text(c.name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                          selected: isSelected,
                          onSelected: (_) => setState(() => _selectedClassId = isSelected ? null : c.id),
                          backgroundColor: isDark ? AppColors.darkCardBg : AppColors.lightCardBg,
                          selectedColor: AppColors.primary.withAlpha(40),
                          checkmarkColor: AppColors.primaryLight,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                            side: BorderSide(
                              color: isSelected ? AppColors.primary : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
                            ),
                          ),
                        ),
                      );
                    }),
                  ],
                ),
              ),

            const SizedBox(height: 8),

            // List View
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _selectedTab == 0
                      ? _buildStudentsList(isDark)
                      : _buildTeachersList(isDark),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStudentsList(bool isDark) {
    final filtered = _filteredStudents;
    if (filtered.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(LucideIcons.users, size: 48, color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
            const SizedBox(height: 12),
            const Text('No students found', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: filtered.length,
      separatorBuilder: (context, index) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final s = filtered[index];
        final isEnrolled = (s.status ?? '').toUpperCase() == 'ACTIVE';

        final initials = s.fullName.trim().isNotEmpty
            ? s.fullName.trim().split(' ').map((e) => e.isNotEmpty ? e[0] : '').take(2).join()
            : 'ST';

        return SlCard(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              SlAvatar(
                initials: initials,
                size: 42,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      s.fullName,
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${s.className ?? "Enrolled"} • ID: ${s.enrollmentNum ?? s.id}',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              SlBadge(
                text: isEnrolled ? 'Enrolled' : (s.status ?? 'Active'),
                variant: isEnrolled ? SlBadgeVariant.success : SlBadgeVariant.danger,
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildTeachersList(bool isDark) {
    final filtered = _filteredTeachers;
    if (filtered.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(LucideIcons.graduationCap, size: 48, color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
            const SizedBox(height: 12),
            const Text('No faculty members found', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: filtered.length,
      separatorBuilder: (context, index) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final t = filtered[index];
        final initials = t.fullName.trim().split(' ').map((e) => e.isNotEmpty ? e[0] : '').take(2).join();

        return SlCard(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              SlAvatar(
                initials: initials.isNotEmpty ? initials : 'T',
                size: 42,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      t.fullName,
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      t.role ?? 'Faculty Member',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                      ),
                    ),
                    if (t.subjects.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Subjects: ${t.subjects.join(", ")}',
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.primaryLight,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              if (t.phoneNumber != null && t.phoneNumber!.isNotEmpty)
                IconButton(
                  icon: const Icon(LucideIcons.phone, size: 18, color: AppColors.emerald),
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Dialing ${t.phoneNumber}...')),
                    );
                  },
                ),
            ],
          ),
        );
      },
    );
  }
}
