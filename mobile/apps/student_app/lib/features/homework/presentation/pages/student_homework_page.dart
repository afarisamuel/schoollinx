import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/student_drawer.dart';

class StudentHomeworkPage extends StatelessWidget {
  const StudentHomeworkPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<HomeworkBloc>()..add(const LoadClassHomeworkEvent('class-1')),
      child: const _StudentHomeworkView(),
    );
  }
}

class _StudentHomeworkView extends StatefulWidget {
  const _StudentHomeworkView();

  @override
  State<_StudentHomeworkView> createState() => _StudentHomeworkViewState();
}

class _StudentHomeworkViewState extends State<_StudentHomeworkView> {
  int _selectedTab = 0; // 0 = Pending, 1 = Completed

  void _submitHomework(BuildContext context, HomeworkEntity task) {
    final textController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (bottomCtx) {
        final isDark = Theme.of(context).brightness == Brightness.dark;

        return Container(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            top: 24,
            bottom: MediaQuery.of(bottomCtx).viewInsets.bottom + 24,
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
              Text(
                'Submit Assignment • ${task.subject}',
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
              ),
              const SizedBox(height: 6),
              Text(
                task.title,
                style: TextStyle(fontSize: 13, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
              ),
              const SizedBox(height: 16),

              SlInput(
                controller: textController,
                label: 'YOUR SUBMISSION NOTES / SOLUTION',
                hintText: 'Type answer or paste link to completed worksheet...',
                maxLines: 3,
              ),

              const SizedBox(height: 16),

              // Upload File Button
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 20),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkBgSecondary : AppColors.lightBgSecondary,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.primary.withAlpha(50)),
                ),
                child: const Column(
                  children: [
                    Icon(LucideIcons.uploadCloud, size: 28, color: AppColors.primaryLight),
                    SizedBox(height: 6),
                    Text('Attach Workbook Photo or PDF', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                    Text('PDF, JPG, PNG up to 10MB', style: TextStyle(fontSize: 11, color: AppColors.darkTextMuted)),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              SlButton(
                text: 'Confirm Submission',
                icon: const Icon(LucideIcons.check, size: 18, color: Colors.white),
                onPressed: () {
                  Navigator.pop(bottomCtx);
                  context.read<HomeworkBloc>().add(
                        SubmitStudentHomeworkEvent(
                          homeworkId: task.id,
                          studentId: 'stu-current',
                          content: textController.text.trim().isNotEmpty ? textController.text.trim() : 'Submitted solution file',
                        ),
                      );
                },
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BlocConsumer<HomeworkBloc, HomeworkState>(
      listener: (context, state) {
        if (state is HomeworkActionSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: AppColors.emerald),
          );
          context.read<HomeworkBloc>().add(const LoadClassHomeworkEvent('class-1'));
        } else if (state is HomeworkError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: AppColors.rose),
          );
        }
      },
      builder: (context, state) {
        final homeworkList = state is HomeworkListLoaded ? state.homeworkList : <HomeworkEntity>[];
        final pending = homeworkList.where((h) => !h.isSubmitted).toList();
        final completed = homeworkList.where((h) => h.isSubmitted).toList();

        return Scaffold(
          drawer: const StudentDrawer(currentRoute: '/homework'),
          appBar: AppBar(
            title: const Text('Homework & Tasks', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
            actions: [
              IconButton(
                icon: const Icon(LucideIcons.refreshCw, size: 18),
                onPressed: () => context.read<HomeworkBloc>().add(const LoadClassHomeworkEvent('class-1')),
              ),
            ],
          ),
          body: SafeArea(
            child: Column(
              children: [
                // Tab switch
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    children: [
                      Expanded(
                        child: SlButton(
                          text: 'Pending (${pending.length})',
                          height: 40,
                          borderRadius: 12,
                          variant: _selectedTab == 0 ? SlButtonVariant.primary : SlButtonVariant.secondary,
                          onPressed: () => setState(() => _selectedTab = 0),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: SlButton(
                          text: 'Completed (${completed.length})',
                          height: 40,
                          borderRadius: 12,
                          variant: _selectedTab == 1 ? SlButtonVariant.primary : SlButtonVariant.secondary,
                          onPressed: () => setState(() => _selectedTab = 1),
                        ),
                      ),
                    ],
                  ),
                ),

                // Content
                Expanded(
                  child: Builder(
                    builder: (context) {
                      if (state is HomeworkLoading) {
                        return const Center(child: CircularProgressIndicator());
                      }
                      if (state is HomeworkError) {
                        return Center(child: Text(state.message, style: const TextStyle(color: AppColors.rose)));
                      }

                      return _selectedTab == 0
                          ? _buildPendingList(context, pending, isDark)
                          : _buildCompletedList(completed, isDark);
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildPendingList(BuildContext context, List<HomeworkEntity> list, bool isDark) {
    if (list.isEmpty) {
      return const Center(child: Text('No pending homework tasks! 🎉', style: TextStyle(fontWeight: FontWeight.w700)));
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final task = list[index];

        return SlCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  SlBadge(text: task.subject, variant: SlBadgeVariant.primary),
                  Text(
                    'Due: ${task.dueDate.day}/${task.dueDate.month}',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.amber),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                task.title,
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
              ),
              const SizedBox(height: 4),
              Text(
                task.description,
                style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
              ),
              const SizedBox(height: 8),
              Text(
                'Instructor: ${task.teacherName}',
                style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
              ),
              const SizedBox(height: 14),
              SlButton(
                text: 'Submit Assignment',
                height: 38,
                icon: const Icon(LucideIcons.upload, size: 16, color: Colors.white),
                onPressed: () => _submitHomework(context, task),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildCompletedList(List<HomeworkEntity> list, bool isDark) {
    if (list.isEmpty) {
      return const Center(child: Text('No completed submissions yet.'));
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final task = list[index];

        return SlCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  SlBadge(text: task.subject, variant: SlBadgeVariant.success),
                  const SlBadge(text: 'SUBMITTED', variant: SlBadgeVariant.success),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                task.title,
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
              ),
              const SizedBox(height: 6),
              if (task.score != null) ...[
                Text(
                  'Score: ${task.score} / ${task.maxScore}',
                  style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.emeraldLight, fontSize: 13),
                ),
                if (task.feedback != null)
                  Text(
                    'Feedback: "${task.feedback}"',
                    style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic),
                  ),
              ],
            ],
          ),
        );
      },
    );
  }
}
