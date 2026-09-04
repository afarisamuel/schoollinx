import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

class StudentCBTPage extends StatelessWidget {
  const StudentCBTPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<CbtBloc>()..add(const LoadCbtQuizzesEvent('CLASS-1')),
      child: const _StudentCBTView(),
    );
  }
}

class _StudentCBTView extends StatelessWidget {
  const _StudentCBTView();

  void _startQuizModal(BuildContext context, CBTQuizEntity quiz) {
    context.read<CbtBloc>().add(StartCbtQuizEvent(quiz));

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (bottomCtx) {
        final isDark = Theme.of(context).brightness == Brightness.dark;
        return BlocProvider.value(
          value: BlocProvider.of<CbtBloc>(context),
          child: BlocConsumer<CbtBloc, CbtState>(
            listener: (context, state) {
              if (state is CbtQuizSubmittedState) {
                Navigator.pop(bottomCtx);
                showDialog(
                  context: context,
                  builder: (dialogCtx) => AlertDialog(
                    title: const Text('Quiz Completed!', style: TextStyle(fontWeight: FontWeight.bold)),
                    content: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 70,
                          height: 70,
                          decoration: BoxDecoration(
                            color: AppColors.emerald.withAlpha(25),
                            shape: BoxShape.circle,
                          ),
                          child: const Center(
                            child: Icon(LucideIcons.award, color: AppColors.emerald, size: 36),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          '${state.percentage.toStringAsFixed(0)}%',
                          style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: AppColors.emeraldLight),
                        ),
                        Text(
                          'You scored ${state.score} of ${state.totalQuestions} questions correctly.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary, fontSize: 13),
                        ),
                        if (state.cheatViolations > 0) ...[
                          const SizedBox(height: 8),
                          Text(
                            '⚠️ ${state.cheatViolations} focus change violations logged.',
                            style: const TextStyle(color: AppColors.rose, fontSize: 11, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ],
                    ),
                    actions: [
                      ElevatedButton(
                        onPressed: () {
                          Navigator.pop(dialogCtx);
                          context.read<CbtBloc>().add(const LoadCbtQuizzesEvent('CLASS-1'));
                        },
                        child: const Text('Return to Quizzes'),
                      ),
                    ],
                  ),
                );
              }
            },
            builder: (context, state) {
              if (state is! CbtActiveQuizState) {
                return const Center(child: CircularProgressIndicator());
              }

              final activeQuiz = state.quiz;
              final questions = state.questions;
              final currentIdx = state.currentQuestionIndex;
              final currentQ = questions[currentIdx];
              final selectedOpt = state.selectedAnswers[currentIdx];

              return Container(
                height: MediaQuery.of(context).size.height * 0.85,
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkBgSecondary : AppColors.lightBgSecondary,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                ),
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(activeQuiz.title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                            Text(
                              '${activeQuiz.subject} • Question ${currentIdx + 1} of ${questions.length}',
                              style: TextStyle(color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted, fontSize: 12),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withAlpha(20),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            children: [
                              const Icon(LucideIcons.timer, size: 14, color: AppColors.primaryLight),
                              const SizedBox(width: 4),
                              Text(
                                '${activeQuiz.durationMinutes}:00',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.primaryLight),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 24),
                    Expanded(
                      child: SingleChildScrollView(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Q${currentIdx + 1}: ${currentQ.questionText}',
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, height: 1.4),
                            ),
                            const SizedBox(height: 20),
                            ...List.generate(currentQ.options.length, (optIdx) {
                              final isOptSelected = selectedOpt == optIdx;
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: InkWell(
                                  onTap: () {
                                    context.read<CbtBloc>().add(
                                          AnswerCbtQuestionEvent(
                                            questionIndex: currentIdx,
                                            selectedOptionIndex: optIdx,
                                          ),
                                        );
                                  },
                                  borderRadius: BorderRadius.circular(14),
                                  child: Container(
                                    padding: const EdgeInsets.all(16),
                                    decoration: BoxDecoration(
                                      color: isOptSelected
                                          ? AppColors.primary.withAlpha(25)
                                          : (isDark ? AppColors.darkCardBg : AppColors.lightCardBg),
                                      borderRadius: BorderRadius.circular(14),
                                      border: Border.all(
                                        color: isOptSelected ? AppColors.primary : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
                                        width: isOptSelected ? 2 : 1,
                                      ),
                                    ),
                                    child: Row(
                                      children: [
                                        Container(
                                          width: 28,
                                          height: 28,
                                          decoration: BoxDecoration(
                                            shape: BoxShape.circle,
                                            color: isOptSelected ? AppColors.primary : Colors.transparent,
                                            border: Border.all(
                                              color: isOptSelected ? AppColors.primary : (isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                                            ),
                                          ),
                                          child: Center(
                                            child: Text(
                                              String.fromCharCode(65 + optIdx),
                                              style: TextStyle(
                                                fontWeight: FontWeight.bold,
                                                fontSize: 12,
                                                color: isOptSelected ? Colors.white : (isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                                              ),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Text(
                                            currentQ.options[optIdx],
                                            style: TextStyle(
                                              fontWeight: isOptSelected ? FontWeight.w800 : FontWeight.w500,
                                              fontSize: 13,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            }),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        if (currentIdx > 0) ...[
                          Expanded(
                            child: SlButton(
                              text: 'Previous',
                              variant: SlButtonVariant.secondary,
                              onPressed: () {
                                context.read<CbtBloc>().add(
                                      AnswerCbtQuestionEvent(
                                        questionIndex: currentIdx - 1,
                                        selectedOptionIndex: state.selectedAnswers[currentIdx - 1] ?? 0,
                                      ),
                                    );
                              },
                            ),
                          ),
                          const SizedBox(width: 12),
                        ],
                        Expanded(
                          child: SlButton(
                            text: currentIdx < questions.length - 1 ? 'Next Question' : 'Submit Exam',
                            icon: const Icon(LucideIcons.arrowRight, size: 18, color: Colors.white),
                            onPressed: () {
                              if (currentIdx < questions.length - 1) {
                                context.read<CbtBloc>().add(
                                      AnswerCbtQuestionEvent(
                                        questionIndex: currentIdx + 1,
                                        selectedOptionIndex: state.selectedAnswers[currentIdx + 1] ?? 0,
                                      ),
                                    );
                              } else {
                                context.read<CbtBloc>().add(SubmitCbtQuizEvent());
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('CBT Exams & Quizzes', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.rotateCw, size: 20),
            onPressed: () => context.read<CbtBloc>().add(const LoadCbtQuizzesEvent('CLASS-1')),
          ),
        ],
      ),
      body: BlocBuilder<CbtBloc, CbtState>(
        builder: (context, state) {
          if (state is CbtLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is CbtError) {
            return Center(child: Text(state.message, style: const TextStyle(color: AppColors.rose)));
          }

          final quizzes = state is CbtQuizzesLoaded ? state.quizzes : <CBTQuizEntity>[];

          if (quizzes.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(LucideIcons.laptop, size: 56, color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                  const SizedBox(height: 12),
                  Text('No active quizzes available', style: TextStyle(color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted)),
                ],
              ),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: quizzes.length,
            separatorBuilder: (c, i) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final q = quizzes[index];
              return SlCard(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        SlBadge(text: q.subject, variant: SlBadgeVariant.primary),
                        if (q.isCompleted)
                          SlBadge(
                            text: '${q.scorePercentage?.toStringAsFixed(0) ?? 0}% Score',
                            variant: SlBadgeVariant.success,
                          )
                        else
                          SlBadge(
                            text: '${q.durationMinutes} Mins',
                            variant: SlBadgeVariant.warning,
                          ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(q.title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                    const SizedBox(height: 4),
                    Text(
                      '${q.totalQuestions} Questions • Multi-choice',
                      style: TextStyle(
                        color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 14),
                    SlButton(
                      text: q.isCompleted ? 'Review Answers' : 'Start Quiz',
                      icon: Icon(q.isCompleted ? LucideIcons.checkCircle : LucideIcons.play, size: 16, color: Colors.white),
                      onPressed: () => _startQuizModal(context, q),
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}
