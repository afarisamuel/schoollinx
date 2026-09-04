import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../domain/entities/academic_extra_entities.dart';
import '../../domain/usecases/academics_usecases.dart';

// EVENTS
abstract class CbtEvent extends Equatable {
  const CbtEvent();
  @override
  List<Object?> get props => [];
}

class LoadCbtQuizzesEvent extends CbtEvent {
  final String classId;
  const LoadCbtQuizzesEvent(this.classId);
  @override
  List<Object?> get props => [classId];
}

class StartCbtQuizEvent extends CbtEvent {
  final CBTQuizEntity quiz;
  const StartCbtQuizEvent(this.quiz);
  @override
  List<Object?> get props => [quiz];
}

class AnswerCbtQuestionEvent extends CbtEvent {
  final int questionIndex;
  final int selectedOptionIndex;
  const AnswerCbtQuestionEvent({required this.questionIndex, required this.selectedOptionIndex});
  @override
  List<Object?> get props => [questionIndex, selectedOptionIndex];
}

class FlagCheatViolationEvent extends CbtEvent {
  final String violationType;
  const FlagCheatViolationEvent(this.violationType);
  @override
  List<Object?> get props => [violationType];
}

class SubmitCbtQuizEvent extends CbtEvent {}

class ResetCbtQuizEvent extends CbtEvent {}

// STATES
abstract class CbtState extends Equatable {
  const CbtState();
  @override
  List<Object?> get props => [];
}

class CbtInitial extends CbtState {}
class CbtLoading extends CbtState {}

class CbtQuizzesLoaded extends CbtState {
  final List<CBTQuizEntity> quizzes;
  const CbtQuizzesLoaded(this.quizzes);
  @override
  List<Object?> get props => [quizzes];
}

class CbtActiveQuizState extends CbtState {
  final CBTQuizEntity quiz;
  final List<CBTQuestionEntity> questions;
  final int currentQuestionIndex;
  final Map<int, int> selectedAnswers; // questionIndex -> optionIndex
  final int cheatViolationCount;
  final int remainingSeconds;

  const CbtActiveQuizState({
    required this.quiz,
    required this.questions,
    required this.currentQuestionIndex,
    required this.selectedAnswers,
    this.cheatViolationCount = 0,
    required this.remainingSeconds,
  });

  int get answeredCount => selectedAnswers.length;

  CbtActiveQuizState copyWith({
    CBTQuizEntity? quiz,
    List<CBTQuestionEntity>? questions,
    int? currentQuestionIndex,
    Map<int, int>? selectedAnswers,
    int? cheatViolationCount,
    int? remainingSeconds,
  }) {
    return CbtActiveQuizState(
      quiz: quiz ?? this.quiz,
      questions: questions ?? this.questions,
      currentQuestionIndex: currentQuestionIndex ?? this.currentQuestionIndex,
      selectedAnswers: selectedAnswers ?? this.selectedAnswers,
      cheatViolationCount: cheatViolationCount ?? this.cheatViolationCount,
      remainingSeconds: remainingSeconds ?? this.remainingSeconds,
    );
  }

  @override
  List<Object?> get props => [quiz, questions, currentQuestionIndex, selectedAnswers, cheatViolationCount, remainingSeconds];
}

class CbtQuizSubmittedState extends CbtState {
  final CBTQuizEntity quiz;
  final int score;
  final int totalQuestions;
  final double percentage;
  final int cheatViolations;

  const CbtQuizSubmittedState({
    required this.quiz,
    required this.score,
    required this.totalQuestions,
    required this.percentage,
    required this.cheatViolations,
  });

  @override
  List<Object?> get props => [quiz, score, totalQuestions, percentage, cheatViolations];
}

class CbtError extends CbtState {
  final String message;
  const CbtError(this.message);
  @override
  List<Object?> get props => [message];
}

// BLOC
class CbtBloc extends Bloc<CbtEvent, CbtState> {
  final GetCBTQuizzesUseCase getCbtQuizzesUseCase;

  CbtBloc({
    required this.getCbtQuizzesUseCase,
  }) : super(CbtInitial()) {
    on<LoadCbtQuizzesEvent>((event, emit) async {
      emit(CbtLoading());
      final result = await getCbtQuizzesUseCase(event.classId);
      result.fold(
        (failure) => emit(CbtError(failure.message)),
        (quizzes) => emit(CbtQuizzesLoaded(quizzes)),
      );
    });

    on<StartCbtQuizEvent>((event, emit) {
      final sampleQuestions = [
        const CBTQuestionEntity(
          id: 'q1',
          questionText: 'What is the powerhouse of the biological cell?',
          options: ['Ribosome', 'Mitochondria', 'Nucleus', 'Endoplasmic Reticulum'],
          correctOptionIndex: 1,
          explanation: 'Mitochondria generate most of the chemical energy needed to power the cell.',
        ),
        const CBTQuestionEntity(
          id: 'q2',
          questionText: 'Solve for x: 3x + 15 = 45',
          options: ['x = 5', 'x = 10', 'x = 12', 'x = 15'],
          correctOptionIndex: 1,
          explanation: '3x = 45 - 15 = 30 => x = 10.',
        ),
        const CBTQuestionEntity(
          id: 'q3',
          questionText: 'Which planet in our solar system is known as the Red Planet?',
          options: ['Venus', 'Mars', 'Jupiter', 'Mercury'],
          correctOptionIndex: 1,
          explanation: 'Mars is known as the Red Planet due to reddish iron oxide on its surface.',
        ),
        const CBTQuestionEntity(
          id: 'q4',
          questionText: 'In English grammar, what part of speech connects clauses or sentences?',
          options: ['Preposition', 'Conjunction', 'Interjection', 'Adverb'],
          correctOptionIndex: 1,
          explanation: 'Conjunctions like "and", "but", "because" connect clauses.',
        ),
      ];

      emit(CbtActiveQuizState(
        quiz: event.quiz,
        questions: sampleQuestions,
        currentQuestionIndex: 0,
        selectedAnswers: const {},
        cheatViolationCount: 0,
        remainingSeconds: event.quiz.durationMinutes * 60,
      ));
    });

    on<AnswerCbtQuestionEvent>((event, emit) {
      if (state is CbtActiveQuizState) {
        final current = state as CbtActiveQuizState;
        final updated = Map<int, int>.from(current.selectedAnswers);
        updated[event.questionIndex] = event.selectedOptionIndex;
        emit(current.copyWith(
          selectedAnswers: updated,
          currentQuestionIndex: event.questionIndex < current.questions.length - 1
              ? event.questionIndex + 1
              : event.questionIndex,
        ));
      }
    });

    on<FlagCheatViolationEvent>((event, emit) {
      if (state is CbtActiveQuizState) {
        final current = state as CbtActiveQuizState;
        final count = current.cheatViolationCount + 1;
        emit(current.copyWith(cheatViolationCount: count));
      }
    });

    on<SubmitCbtQuizEvent>((event, emit) {
      if (state is CbtActiveQuizState) {
        final current = state as CbtActiveQuizState;
        int correctCount = 0;
        for (int i = 0; i < current.questions.length; i++) {
          if (current.selectedAnswers[i] == current.questions[i].correctOptionIndex) {
            correctCount++;
          }
        }
        final percentage = (correctCount / current.questions.length) * 100;
        emit(CbtQuizSubmittedState(
          quiz: current.quiz,
          score: correctCount,
          totalQuestions: current.questions.length,
          percentage: percentage,
          cheatViolations: current.cheatViolationCount,
        ));
      }
    });

    on<ResetCbtQuizEvent>((event, emit) {
      emit(CbtInitial());
    });
  }
}
