import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/teacher_drawer.dart';

class TeacherHomeworkPage extends StatelessWidget {
  const TeacherHomeworkPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<HomeworkBloc>()..add(LoadTeacherHomeworkClassesEvent()),
      child: const _TeacherHomeworkView(),
    );
  }
}

class _TeacherHomeworkView extends StatefulWidget {
  const _TeacherHomeworkView();

  @override
  State<_TeacherHomeworkView> createState() => _TeacherHomeworkViewState();
}

class _TeacherHomeworkViewState extends State<_TeacherHomeworkView> {
  void _showCreateHomeworkDialog(BuildContext context, AcademicClassEntity? selectedClass) {
    final titleController = TextEditingController();
    final subjectController = TextEditingController(text: 'Mathematics');
    final descController = TextEditingController();
    DateTime dueDate = DateTime.now().add(const Duration(days: 3));

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        return StatefulBuilder(
          builder: (modalCtx, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(
                top: 24,
                left: 20,
                right: 20,
                bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 24,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Create Homework Assignment',
                          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
                        ),
                        IconButton(
                          icon: const Icon(LucideIcons.x, size: 20),
                          onPressed: () => Navigator.pop(modalCtx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    SlInput(
                      label: 'SUBJECT',
                      controller: subjectController,
                      prefixIcon: const Icon(LucideIcons.book, size: 18),
                      hintText: 'e.g. Mathematics',
                    ),
                    const SizedBox(height: 12),
                    SlInput(
                      label: 'ASSIGNMENT TITLE',
                      controller: titleController,
                      prefixIcon: const Icon(LucideIcons.fileText, size: 18),
                      hintText: 'e.g. Quadratic Equations Exercise 4B',
                    ),
                    const SizedBox(height: 12),
                    SlInput(
                      label: 'INSTRUCTIONS / PROMPT',
                      controller: descController,
                      maxLines: 3,
                      prefixIcon: const Icon(LucideIcons.alignLeft, size: 18),
                      hintText: 'Solve problems 1-10 on page 42 with clear workings.',
                    ),
                    const SizedBox(height: 12),
                    InkWell(
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: modalCtx,
                          initialDate: dueDate,
                          firstDate: DateTime.now(),
                          lastDate: DateTime.now().add(const Duration(days: 60)),
                        );
                        if (picked != null) {
                          setSheetState(() => dueDate = picked);
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.darkBgSecondary : AppColors.lightBgSecondary,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Due Date:',
                              style: TextStyle(
                                color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            Text(
                              DateFormat('EEEE, MMM d, yyyy').format(dueDate),
                              style: const TextStyle(fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    SlButton(
                      text: 'Publish Homework',
                      icon: const Icon(LucideIcons.send, size: 18, color: Colors.white),
                      onPressed: () {
                        if (titleController.text.trim().isEmpty || selectedClass == null) {
                          return;
                        }
                        context.read<HomeworkBloc>().add(
                          CreateHomeworkEvent(
                            title: titleController.text.trim(),
                            description: descController.text.trim(),
                            subject: subjectController.text.trim(),
                            classId: selectedClass.id,
                            dueDate: dueDate,
                          ),
                        );
                        Navigator.pop(modalCtx);
                      },
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _viewSubmissions(BuildContext context, HomeworkEntity hw) {
    context.read<HomeworkBloc>().add(LoadHomeworkSubmissionsEvent(hw.id));

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;

        return BlocBuilder<HomeworkBloc, HomeworkState>(
          builder: (blocCtx, state) {
            return Container(
              height: MediaQuery.of(ctx).size.height * 0.75,
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(hw.title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16), maxLines: 1, overflow: TextOverflow.ellipsis),
                            Text(
                              '${hw.subject} • Submissions',
                              style: TextStyle(
                                color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(icon: const Icon(LucideIcons.x, size: 20), onPressed: () => Navigator.pop(ctx)),
                    ],
                  ),
                  const Divider(height: 24),
                  if (state is HomeworkLoading)
                    const Expanded(child: Center(child: CircularProgressIndicator()))
                  else if (state is HomeworkSubmissionsLoaded) ...[
                    if (state.submissions.isEmpty)
                      Expanded(
                        child: Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(LucideIcons.inbox, size: 48, color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                              const SizedBox(height: 8),
                              Text(
                                'No student submissions yet for this task',
                                style: TextStyle(color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                              ),
                            ],
                          ),
                        ),
                      )
                    else
                      Expanded(
                        child: ListView.separated(
                          itemCount: state.submissions.length,
                          separatorBuilder: (c, i) => const SizedBox(height: 12),
                          itemBuilder: (subCtx, index) {
                            final sub = state.submissions[index];
                            return SlCard(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(sub.studentName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                                      SlBadge(
                                        text: sub.score != null ? '${sub.score!.toStringAsFixed(0)}/100' : 'Ungraded',
                                        variant: sub.score != null ? SlBadgeVariant.success : SlBadgeVariant.warning,
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    sub.content,
                                    style: TextStyle(
                                      color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                      fontSize: 13,
                                    ),
                                  ),
                                  if (sub.feedback != null && sub.feedback!.isNotEmpty) ...[
                                    const SizedBox(height: 6),
                                    Text('Feedback: ${sub.feedback}', style: const TextStyle(fontStyle: FontStyle.italic, fontSize: 12, color: AppColors.primaryLight)),
                                  ],
                                  const SizedBox(height: 10),
                                  Align(
                                    alignment: Alignment.centerRight,
                                    child: TextButton.icon(
                                      icon: const Icon(LucideIcons.edit3, size: 14),
                                      label: Text(sub.score != null ? 'Re-grade' : 'Grade Submission'),
                                      onPressed: () => _gradeSubmissionDialog(context, sub),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
                  ] else
                    const Expanded(child: Center(child: Text('Loading submissions...'))),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _gradeSubmissionDialog(BuildContext parentContext, HomeworkSubmissionEntity sub) {
    final scoreController = TextEditingController(text: sub.score?.toStringAsFixed(0) ?? '');
    final feedbackController = TextEditingController(text: sub.feedback ?? '');

    showDialog(
      context: parentContext,
      builder: (dialogCtx) => AlertDialog(
        title: Text('Grade ${sub.studentName}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SlInput(
              label: 'SCORE (OUT OF 100)',
              controller: scoreController,
              keyboardType: TextInputType.number,
              prefixIcon: const Icon(LucideIcons.checkSquare, size: 18),
            ),
            const SizedBox(height: 12),
            SlInput(
              label: 'FEEDBACK / REMARKS',
              controller: feedbackController,
              maxLines: 2,
              prefixIcon: const Icon(LucideIcons.messageSquare, size: 18),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogCtx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              final score = double.tryParse(scoreController.text.trim()) ?? 0.0;
              Navigator.pop(dialogCtx);
              parentContext.read<HomeworkBloc>().add(
                GradeSubmissionEvent(
                  submissionId: sub.id,
                  score: score,
                  feedback: feedbackController.text.trim(),
                  homeworkId: sub.homeworkId,
                ),
              );
            },
            child: const Text('Save Grade'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BlocConsumer<HomeworkBloc, HomeworkState>(
      listener: (context, state) {
        if (state is HomeworkActionSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('✅ ${state.message}'),
              backgroundColor: AppColors.emerald,
              behavior: SnackBarBehavior.floating,
            ),
          );
        } else if (state is HomeworkError) {
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
        AcademicClassEntity? selectedClass;
        List<AcademicClassEntity> classes = [];
        List<HomeworkEntity> homeworkList = [];

        if (state is HomeworkListLoaded) {
          classes = state.classes;
          selectedClass = state.selectedClass;
          homeworkList = state.homeworkList;
        }

        return Scaffold(
          drawer: const TeacherDrawer(currentRoute: '/homework'),
          appBar: AppBar(
            title: const Text('Homework & Assignments', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
            actions: [
              IconButton(
                icon: const Icon(LucideIcons.rotateCw, size: 20),
                onPressed: () {
                  context.read<HomeworkBloc>().add(LoadTeacherHomeworkClassesEvent());
                },
              ),
            ],
          ),
          floatingActionButton: FloatingActionButton.extended(
            onPressed: () => _showCreateHomeworkDialog(context, selectedClass),
            icon: const Icon(LucideIcons.plus, size: 18, color: Colors.white),
            label: const Text('New Homework', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
            backgroundColor: AppColors.primary,
          ),
          body: Column(
            children: [
              if (classes.isNotEmpty)
                Container(
                  height: 48,
                  margin: const EdgeInsets.symmetric(vertical: 8),
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: classes.length,
                    separatorBuilder: (c, i) => const SizedBox(width: 8),
                    itemBuilder: (context, index) {
                      final cl = classes[index];
                      final isSelected = cl.id == selectedClass?.id;
                      return ChoiceChip(
                        label: Text(cl.name),
                        selected: isSelected,
                        onSelected: (selected) {
                          if (selected) {
                            context.read<HomeworkBloc>().add(SelectHomeworkClassEvent(cl));
                          }
                        },
                        selectedColor: AppColors.primary,
                        labelStyle: TextStyle(
                          color: isSelected ? Colors.white : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        ),
                      );
                    },
                  ),
                ),
              Expanded(
                child: state is HomeworkLoading
                    ? const Center(child: CircularProgressIndicator())
                    : homeworkList.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(LucideIcons.bookOpen, size: 56, color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                                const SizedBox(height: 12),
                                Text(
                                  'No homework assignments found for this class',
                                  style: TextStyle(color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                                ),
                              ],
                            ),
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.all(16),
                            itemCount: homeworkList.length,
                            separatorBuilder: (c, i) => const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final hw = homeworkList[index];
                              return SlCard(
                                padding: const EdgeInsets.all(16),
                                onTap: () => _viewSubmissions(context, hw),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        SlBadge(text: hw.subject, variant: SlBadgeVariant.primary),
                                        Text(
                                          'Due: ${DateFormat('MMM d, yyyy').format(hw.dueDate)}',
                                          style: TextStyle(
                                            color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Text(hw.title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                                    const SizedBox(height: 4),
                                    Text(
                                      hw.description,
                                      style: TextStyle(
                                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                        fontSize: 13,
                                      ),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 12),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          'Max: ${hw.maxScore} pts',
                                          style: TextStyle(
                                            color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                                            fontSize: 11,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                        const Row(
                                          children: [
                                            Text(
                                              'View Submissions',
                                              style: TextStyle(
                                                color: AppColors.primaryLight,
                                                fontWeight: FontWeight.w800,
                                                fontSize: 12,
                                              ),
                                            ),
                                            SizedBox(width: 4),
                                            Icon(LucideIcons.chevronRight, size: 14, color: AppColors.primaryLight),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
              ),
            ],
          ),
        );
      },
    );
  }
}
