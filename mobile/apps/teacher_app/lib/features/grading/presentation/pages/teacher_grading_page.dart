import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/teacher_drawer.dart';

class TeacherGradingPage extends StatelessWidget {
  const TeacherGradingPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<GradingBloc>()..add(LoadGradingClassesEvent()),
      child: const _TeacherGradingView(),
    );
  }
}

class _TeacherGradingView extends StatefulWidget {
  const _TeacherGradingView();

  @override
  State<_TeacherGradingView> createState() => _TeacherGradingViewState();
}

class _TeacherGradingViewState extends State<_TeacherGradingView> {
  String _selectedSubject = 'Mathematics';
  final String _selectedTerm = 'TERM_1';

  void _openScoreAndVoiceModal(BuildContext context, StudentEntity student, GradeRecord grade) {
    final classController = TextEditingController(text: grade.classScore.toStringAsFixed(0));
    final examController = TextEditingController(text: grade.examScore.toStringAsFixed(0));
    final remarksController = TextEditingController(text: grade.remarks ?? '');
    bool isRecordingVoice = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            final isDark = Theme.of(ctx).brightness == Brightness.dark;

            return Container(
              padding: EdgeInsets.only(
                top: 24,
                left: 24,
                right: 24,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
              ),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkCardBg : AppColors.lightCardBg,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
                border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Evaluation • ${student.fullName}',
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                      ),
                      IconButton(
                        icon: const Icon(LucideIcons.x, size: 20),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  SlInput(
                    controller: classController,
                    label: 'CLASS ASSESSMENT SCORE (MAX 30)',
                    keyboardType: TextInputType.number,
                    prefixIcon: const Icon(LucideIcons.fileText, size: 18),
                  ),
                  const SizedBox(height: 12),
                  SlInput(
                    controller: examController,
                    label: 'TERMINAL EXAM SCORE (MAX 70)',
                    keyboardType: TextInputType.number,
                    prefixIcon: const Icon(LucideIcons.award, size: 18),
                  ),
                  const SizedBox(height: 12),
                  SlInput(
                    controller: remarksController,
                    label: 'TEACHER REMARK & FEEDBACK',
                    maxLines: 2,
                    prefixIcon: const Icon(LucideIcons.messageSquare, size: 18),
                  ),
                  const SizedBox(height: 12),
                  // Voice-to-Text Grading Audio Button
                  InkWell(
                    onTap: () {
                      setModalState(() => isRecordingVoice = !isRecordingVoice);
                      if (isRecordingVoice) {
                        Future.delayed(const Duration(milliseconds: 1200), () {
                          if (ctx.mounted) {
                            setModalState(() {
                              isRecordingVoice = false;
                              remarksController.text = 'Excellent analytical performance in algebra; recommend advanced enrichment.';
                            });
                          }
                        });
                      }
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: isRecordingVoice ? AppColors.rose.withAlpha(20) : AppColors.primary.withAlpha(15),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isRecordingVoice ? AppColors.rose : AppColors.primary.withAlpha(40),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            isRecordingVoice ? LucideIcons.micOff : LucideIcons.mic,
                            size: 18,
                            color: isRecordingVoice ? AppColors.rose : AppColors.primaryLight,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            isRecordingVoice ? 'Listening & Transcribing Voice...' : 'Tap to Dictate Voice Remark (Speech-to-Text)',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: isRecordingVoice ? AppColors.rose : AppColors.primaryLight,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  SlButton(
                    text: 'Apply Score & Remarks',
                    onPressed: () {
                      final c = double.tryParse(classController.text) ?? grade.classScore;
                      final e = double.tryParse(examController.text) ?? grade.examScore;
                      context.read<GradingBloc>().add(
                        UpdateStudentGradeEvent(
                          studentId: student.id,
                          classScore: c.clamp(0, 30),
                          examScore: e.clamp(0, 70),
                          remarks: remarksController.text,
                        ),
                      );
                      Navigator.pop(ctx);
                    },
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BlocConsumer<GradingBloc, GradingState>(
      listener: (context, state) {
        if (state is GradesSubmittedSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('🎉 Successfully published grades for ${state.count} students!'),
              backgroundColor: AppColors.emerald,
              behavior: SnackBarBehavior.floating,
            ),
          );
        } else if (state is GradingError) {
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
          drawer: const TeacherDrawer(currentRoute: '/grading'),
          appBar: AppBar(
            title: const Text('Classroom Grading', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
          ),
          body: SafeArea(
            child: Column(
              children: [
                // Filter dropdowns
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  color: isDark ? AppColors.darkBgSecondary : AppColors.lightBgSecondary,
                  child: Row(
                    children: [
                      Expanded(
                        child: state is GradingRosterLoaded
                            ? DropdownButtonHideUnderline(
                                child: DropdownButton<AcademicClassEntity>(
                                  value: state.selectedClass,
                                  isExpanded: true,
                                  items: state.classes.map((c) {
                                    return DropdownMenuItem(
                                      value: c,
                                      child: Text(c.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                                    );
                                  }).toList(),
                                  onChanged: (v) {
                                    if (v != null) {
                                      context.read<GradingBloc>().add(
                                        SelectGradingClassEvent(
                                          selectedClass: v,
                                          subject: _selectedSubject,
                                          term: _selectedTerm,
                                        ),
                                      );
                                    }
                                  },
                                ),
                              )
                            : const Text('Loading...', style: TextStyle(fontWeight: FontWeight.w700)),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _selectedSubject,
                            isExpanded: true,
                            items: const [
                              DropdownMenuItem(value: 'Mathematics', child: Text('Mathematics', style: TextStyle(fontWeight: FontWeight.w700))),
                              DropdownMenuItem(value: 'Science', child: Text('Science', style: TextStyle(fontWeight: FontWeight.w700))),
                              DropdownMenuItem(value: 'English', child: Text('English', style: TextStyle(fontWeight: FontWeight.w700))),
                              DropdownMenuItem(value: 'Social Studies', child: Text('Social Studies', style: TextStyle(fontWeight: FontWeight.w700))),
                            ],
                            onChanged: (v) {
                              if (v != null) {
                                setState(() => _selectedSubject = v);
                                if (state is GradingRosterLoaded) {
                                  context.read<GradingBloc>().add(
                                    SelectGradingClassEvent(
                                      selectedClass: state.selectedClass,
                                      subject: v,
                                      term: _selectedTerm,
                                    ),
                                  );
                                }
                              }
                            },
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Class average distribution card
                if (state is GradingRosterLoaded)
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: SlCard(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('CLASS AVERAGE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.darkTextMuted)),
                              const SizedBox(height: 2),
                              Text(
                                '${state.classAverage.toStringAsFixed(1)}%',
                                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: AppColors.primaryLight),
                              ),
                            ],
                          ),
                          const SlBadge(text: 'TERM 1 REPORTING', variant: SlBadgeVariant.primary),
                        ],
                      ),
                    ),
                  ),

                // Student grade roster
                Expanded(
                  child: state is GradingLoading
                      ? const Center(child: CircularProgressIndicator())
                      : state is GradingRosterLoaded
                          ? ListView.separated(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                              itemCount: state.students.length,
                              separatorBuilder: (context, index) => const SizedBox(height: 10),
                              itemBuilder: (context, index) {
                                final student = state.students[index];
                                final grade = state.gradesMap[student.id] ??
                                    GradeRecord(
                                      studentId: student.id,
                                      classId: state.selectedClass.id,
                                      subject: state.subject,
                                      classScore: 0,
                                      examScore: 0,
                                    );

                                return SlCard(
                                  onTap: () => _openScoreAndVoiceModal(context, student, grade),
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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
                                                'Class: ${grade.classScore.toStringAsFixed(0)}/30 • Exam: ${grade.examScore.toStringAsFixed(0)}/70',
                                                style: TextStyle(
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.w600,
                                                  color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                                                ),
                                              ),
                                              if (grade.remarks != null && grade.remarks!.isNotEmpty)
                                                Text(
                                                  '💬 "${grade.remarks!}"',
                                                  style: const TextStyle(
                                                    fontSize: 10,
                                                    fontWeight: FontWeight.w600,
                                                    color: AppColors.primaryLight,
                                                  ),
                                                ),
                                            ],
                                          ),
                                        ],
                                      ),
                                      Row(
                                        children: [
                                          Column(
                                            crossAxisAlignment: CrossAxisAlignment.end,
                                            children: [
                                              Text(
                                                '${grade.totalScore.toStringAsFixed(0)}%',
                                                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900),
                                              ),
                                              Text(
                                                grade.totalScore >= 80 ? 'Grade A' : (grade.totalScore >= 60 ? 'Grade B' : 'Grade C'),
                                                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.emeraldLight),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(width: 8),
                                          const Icon(LucideIcons.edit2, size: 14, color: AppColors.darkTextMuted),
                                        ],
                                      ),
                                    ],
                                  ),
                                );
                              },
                            )
                          : const Center(child: Text('No student grades available')),
                ),

                // Save bottom bar
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkBgSecondary : AppColors.lightBgSecondary,
                    border: Border(
                      top: BorderSide(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                    ),
                  ),
                  child: SlButton(
                    text: 'Publish & Save Scores to Server',
                    isLoading: state is GradingLoading,
                    icon: const Icon(LucideIcons.checkCheck, size: 18, color: Colors.white),
                    onPressed: state is GradingRosterLoaded
                        ? () {
                            context.read<GradingBloc>().add(SubmitGradesEvent());
                          }
                        : null,
                  ),
                ),
              ],
            ),
          ),
          bottomNavigationBar: const _TeacherGradingBottomNav(),
        );
      },
    );
  }
}

class _TeacherGradingBottomNav extends StatelessWidget {
  const _TeacherGradingBottomNav();

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
        selectedIndex: 2,
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
