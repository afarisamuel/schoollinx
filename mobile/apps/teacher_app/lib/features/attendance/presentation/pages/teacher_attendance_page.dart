import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

class TeacherAttendancePage extends StatelessWidget {
  const TeacherAttendancePage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<AttendanceBloc>()..add(LoadAttendanceClassesEvent()),
      child: const _TeacherAttendanceView(),
    );
  }
}

class _TeacherAttendanceView extends StatefulWidget {
  const _TeacherAttendanceView();

  @override
  State<_TeacherAttendanceView> createState() => _TeacherAttendanceViewState();
}

class _TeacherAttendanceViewState extends State<_TeacherAttendanceView> {
  final DateTime _selectedDate = DateTime.now();
  String _selectedPeriod = 'Morning Homeroom';

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BlocConsumer<AttendanceBloc, AttendanceState>(
      listener: (context, state) {
        if (state is AttendanceSubmittedSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('✅ Attendance for ${state.count} students saved successfully!'),
              backgroundColor: AppColors.emerald,
              behavior: SnackBarBehavior.floating,
            ),
          );
        } else if (state is AttendanceError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('⚠️ ${state.message}'),
              backgroundColor: AppColors.rose,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      },
      builder: (context, state) {
        return Scaffold(
          appBar: AppBar(
            title: const Text('Attendance Register', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
            actions: [
              if (state is AttendanceRosterLoaded)
                IconButton(
                  icon: const Icon(LucideIcons.checkCheck, size: 20, color: AppColors.emerald),
                  tooltip: 'Mark All Present',
                  onPressed: () {
                    context.read<AttendanceBloc>().add(const MarkAllAttendanceEvent('PRESENT'));
                  },
                ),
            ],
          ),
          body: SafeArea(
            child: Column(
              children: [
                // Class & Period selector
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  color: isDark ? AppColors.darkBgSecondary : AppColors.lightBgSecondary,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      if (state is AttendanceRosterLoaded)
                        DropdownButtonHideUnderline(
                          child: DropdownButton<AcademicClassEntity>(
                            value: state.selectedClass,
                            icon: const Icon(LucideIcons.chevronDown, size: 16),
                            items: state.classes.map((cls) {
                              return DropdownMenuItem(
                                value: cls,
                                child: Text(
                                  cls.name,
                                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                                ),
                              );
                            }).toList(),
                            onChanged: (val) {
                              if (val != null) {
                                context.read<AttendanceBloc>().add(SelectAttendanceClassEvent(val));
                              }
                            },
                          ),
                        )
                      else if (state is AttendanceLoading)
                        const Text('Loading roster...', style: TextStyle(fontWeight: FontWeight.w700))
                      else
                        const Text('Select Class', style: TextStyle(fontWeight: FontWeight.w700)),
                      DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _selectedPeriod,
                          icon: const Icon(LucideIcons.clock, size: 14, color: AppColors.primaryLight),
                          items: const [
                            DropdownMenuItem(value: 'Morning Homeroom', child: Text('Homeroom', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700))),
                            DropdownMenuItem(value: 'Period 1 (Math)', child: Text('Period 1', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700))),
                            DropdownMenuItem(value: 'Period 2 (Science)', child: Text('Period 2', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700))),
                            DropdownMenuItem(value: 'Period 3 (English)', child: Text('Period 3', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700))),
                          ],
                          onChanged: (val) {
                            if (val != null) setState(() => _selectedPeriod = val);
                          },
                        ),
                      ),
                    ],
                  ),
                ),

                // KPI Stats Banner
                if (state is AttendanceRosterLoaded)
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Expanded(
                          child: _AttendanceSummaryCard(
                            label: 'PRESENT',
                            count: state.presentCount,
                            color: AppColors.emerald,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _AttendanceSummaryCard(
                            label: 'ABSENT',
                            count: state.absentCount,
                            color: AppColors.rose,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _AttendanceSummaryCard(
                            label: 'LATE',
                            count: state.lateCount,
                            color: AppColors.amber,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _AttendanceSummaryCard(
                            label: 'SICK BAY',
                            count: state.sickBayCount,
                            color: AppColors.purple,
                          ),
                        ),
                      ],
                    ),
                  ),

                // Student List
                Expanded(
                  child: state is AttendanceLoading
                      ? const Center(child: CircularProgressIndicator())
                      : state is AttendanceRosterLoaded
                          ? ListView.separated(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                              itemCount: state.students.length,
                              separatorBuilder: (context, index) => const SizedBox(height: 10),
                              itemBuilder: (context, index) {
                                final student = state.students[index];
                                final status = state.statusMap[student.id] ?? 'PRESENT';

                                return SlCard(
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Row(
                                        children: [
                                          SlAvatar(
                                            initials: student.firstName.isNotEmpty ? student.firstName.substring(0, 1) : 'S',
                                            size: 38,
                                          ),
                                          const SizedBox(width: 12),
                                          Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                student.fullName.isNotEmpty ? student.fullName : 'Student',
                                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                                              ),
                                              Text(
                                                student.enrollmentNum ?? 'STU-${student.id.substring(0, 3)}',
                                                style: TextStyle(
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.w600,
                                                  color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                      Row(
                                        children: [
                                          _StatusToggleBtn(
                                            label: 'P',
                                            isActive: status == 'PRESENT',
                                            activeColor: AppColors.emerald,
                                            onTap: () {
                                              context.read<AttendanceBloc>().add(
                                                ToggleStudentAttendanceStatusEvent(
                                                  studentId: student.id,
                                                  newStatus: 'PRESENT',
                                                ),
                                              );
                                            },
                                          ),
                                          const SizedBox(width: 4),
                                          _StatusToggleBtn(
                                            label: 'L',
                                            isActive: status == 'LATE',
                                            activeColor: AppColors.amber,
                                            onTap: () {
                                              context.read<AttendanceBloc>().add(
                                                ToggleStudentAttendanceStatusEvent(
                                                  studentId: student.id,
                                                  newStatus: 'LATE',
                                                ),
                                              );
                                            },
                                          ),
                                          const SizedBox(width: 4),
                                          _StatusToggleBtn(
                                            label: 'A',
                                            isActive: status == 'ABSENT',
                                            activeColor: AppColors.rose,
                                            onTap: () {
                                              context.read<AttendanceBloc>().add(
                                                ToggleStudentAttendanceStatusEvent(
                                                  studentId: student.id,
                                                  newStatus: 'ABSENT',
                                                ),
                                              );
                                            },
                                          ),
                                          const SizedBox(width: 4),
                                          _StatusToggleBtn(
                                            label: 'S',
                                            isActive: status == 'SICK_BAY',
                                            activeColor: AppColors.purple,
                                            onTap: () {
                                              context.read<AttendanceBloc>().add(
                                                ToggleStudentAttendanceStatusEvent(
                                                  studentId: student.id,
                                                  newStatus: 'SICK_BAY',
                                                ),
                                              );
                                            },
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                );
                              },
                            )
                          : const Center(child: Text('No attendance roster available')),
                ),

                // Save Bottom Bar
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkBgSecondary : AppColors.lightBgSecondary,
                    border: Border(
                      top: BorderSide(
                        color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                      ),
                    ),
                  ),
                  child: SlButton(
                    text: 'Save Attendance Register',
                    isLoading: state is AttendanceLoading,
                    icon: const Icon(LucideIcons.save, size: 18, color: Colors.white),
                    onPressed: state is AttendanceRosterLoaded
                        ? () {
                            context.read<AttendanceBloc>().add(
                              SubmitAttendanceEvent(
                                date: _selectedDate,
                                remarks: '$_selectedPeriod rollcall',
                              ),
                            );
                          }
                        : null,
                  ),
                ),
              ],
            ),
          ),
          bottomNavigationBar: const _TeacherAttendanceBottomNav(),
        );
      },
    );
  }
}

class _AttendanceSummaryCard extends StatelessWidget {
  final String label;
  final int count;
  final Color color;

  const _AttendanceSummaryCard({
    required this.label,
    required this.count,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        color: color.withAlpha(20),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withAlpha(50)),
      ),
      child: Column(
        children: [
          Text(
            count.toString(),
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              fontSize: 8,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.5,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusToggleBtn extends StatelessWidget {
  final String label;
  final bool isActive;
  final Color activeColor;
  final VoidCallback onTap;

  const _StatusToggleBtn({
    required this.label,
    required this.isActive,
    required this.activeColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: 28,
        height: 28,
        decoration: BoxDecoration(
          color: isActive ? activeColor : (isDark ? AppColors.darkBgTertiary : AppColors.lightBgTertiary),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isActive ? activeColor : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
          ),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              fontWeight: FontWeight.w900,
              fontSize: 11,
              color: isActive ? Colors.white : (isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
            ),
          ),
        ),
      ),
    );
  }
}

class _TeacherAttendanceBottomNav extends StatelessWidget {
  const _TeacherAttendanceBottomNav();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkBgSecondary : AppColors.lightBgSecondary,
        border: Border(
          top: BorderSide(
            color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
          ),
        ),
      ),
      child: NavigationBar(
        selectedIndex: 1,
        backgroundColor: Colors.transparent,
        elevation: 0,
        indicatorColor: AppColors.primary.withAlpha(30),
        destinations: const [
          NavigationDestination(icon: Icon(LucideIcons.home, size: 20), label: 'Home'),
          NavigationDestination(icon: Icon(LucideIcons.calendarCheck, size: 20), label: 'Attendance'),
          NavigationDestination(icon: Icon(LucideIcons.fileSpreadsheet, size: 20), label: 'Grading'),
          NavigationDestination(icon: Icon(LucideIcons.clock, size: 20), label: 'Timetable'),
          NavigationDestination(icon: Icon(LucideIcons.user, size: 20), label: 'Profile'),
        ],
        onDestinationSelected: (index) {
          switch (index) {
            case 0:
              context.go('/dashboard');
              break;
            case 1:
              context.go('/attendance');
              break;
            case 2:
              context.go('/grading');
              break;
            case 3:
              context.go('/timetable');
              break;
            case 4:
              context.go('/profile');
              break;
          }
        },
      ),
    );
  }
}
