import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../../core/usecases/usecase.dart';
import '../../domain/entities/academic_class_entity.dart';
import '../../domain/entities/academic_extra_entities.dart';
import '../../domain/entities/homework_entity.dart';
import '../../domain/usecases/academics_usecases.dart';

// EVENTS
abstract class HomeworkEvent extends Equatable {
  const HomeworkEvent();
  @override
  List<Object?> get props => [];
}

class LoadTeacherHomeworkClassesEvent extends HomeworkEvent {}

class LoadClassHomeworkEvent extends HomeworkEvent {
  final String classId;
  const LoadClassHomeworkEvent(this.classId);
  @override
  List<Object?> get props => [classId];
}

class SelectHomeworkClassEvent extends HomeworkEvent {
  final AcademicClassEntity selectedClass;
  const SelectHomeworkClassEvent(this.selectedClass);
  @override
  List<Object?> get props => [selectedClass];
}

class CreateHomeworkEvent extends HomeworkEvent {
  final String title;
  final String description;
  final String subject;
  final String classId;
  final DateTime dueDate;
  final int maxScore;

  const CreateHomeworkEvent({
    required this.title,
    required this.description,
    required this.subject,
    required this.classId,
    required this.dueDate,
    this.maxScore = 100,
  });

  @override
  List<Object?> get props => [title, description, subject, classId, dueDate, maxScore];
}

class LoadHomeworkSubmissionsEvent extends HomeworkEvent {
  final String homeworkId;
  const LoadHomeworkSubmissionsEvent(this.homeworkId);
  @override
  List<Object?> get props => [homeworkId];
}

class GradeSubmissionEvent extends HomeworkEvent {
  final String submissionId;
  final double score;
  final String feedback;
  final String homeworkId;

  const GradeSubmissionEvent({
    required this.submissionId,
    required this.score,
    required this.feedback,
    required this.homeworkId,
  });

  @override
  List<Object?> get props => [submissionId, score, feedback, homeworkId];
}

class SubmitStudentHomeworkEvent extends HomeworkEvent {
  final String homeworkId;
  final String studentId;
  final String content;
  final String? fileUrl;

  const SubmitStudentHomeworkEvent({
    required this.homeworkId,
    required this.studentId,
    required this.content,
    this.fileUrl,
  });

  @override
  List<Object?> get props => [homeworkId, studentId, content, fileUrl];
}

// STATES
abstract class HomeworkState extends Equatable {
  const HomeworkState();
  @override
  List<Object?> get props => [];
}

class HomeworkInitial extends HomeworkState {}
class HomeworkLoading extends HomeworkState {}

class HomeworkListLoaded extends HomeworkState {
  final List<AcademicClassEntity> classes;
  final AcademicClassEntity? selectedClass;
  final List<HomeworkEntity> homeworkList;

  const HomeworkListLoaded({
    required this.classes,
    this.selectedClass,
    required this.homeworkList,
  });

  @override
  List<Object?> get props => [classes, selectedClass, homeworkList];
}

class HomeworkSubmissionsLoaded extends HomeworkState {
  final String homeworkId;
  final List<HomeworkSubmissionEntity> submissions;

  const HomeworkSubmissionsLoaded({
    required this.homeworkId,
    required this.submissions,
  });

  @override
  List<Object?> get props => [homeworkId, submissions];
}

class HomeworkActionSuccess extends HomeworkState {
  final String message;
  const HomeworkActionSuccess(this.message);
  @override
  List<Object?> get props => [message];
}

class HomeworkError extends HomeworkState {
  final String message;
  const HomeworkError(this.message);
  @override
  List<Object?> get props => [message];
}

// BLOC
class HomeworkBloc extends Bloc<HomeworkEvent, HomeworkState> {
  final GetClassesUseCase getClassesUseCase;
  final GetHomeworkByClassUseCase getHomeworkByClassUseCase;
  final CreateHomeworkUseCase createHomeworkUseCase;
  final GetHomeworkSubmissionsUseCase getHomeworkSubmissionsUseCase;
  final GradeHomeworkSubmissionUseCase gradeHomeworkSubmissionUseCase;
  final SubmitHomeworkUseCase submitHomeworkUseCase;

  List<AcademicClassEntity> _classes = [];
  AcademicClassEntity? _selectedClass;

  HomeworkBloc({
    required this.getClassesUseCase,
    required this.getHomeworkByClassUseCase,
    required this.createHomeworkUseCase,
    required this.getHomeworkSubmissionsUseCase,
    required this.gradeHomeworkSubmissionUseCase,
    required this.submitHomeworkUseCase,
  }) : super(HomeworkInitial()) {
    on<LoadTeacherHomeworkClassesEvent>((event, emit) async {
      emit(HomeworkLoading());
      final result = await getClassesUseCase(NoParams());
      result.fold(
        (failure) => emit(HomeworkError(failure.message)),
        (classes) {
          _classes = classes;
          if (classes.isNotEmpty) {
            add(SelectHomeworkClassEvent(classes.first));
          } else {
            emit(const HomeworkListLoaded(classes: [], homeworkList: []));
          }
        },
      );
    });

    on<LoadClassHomeworkEvent>((event, emit) async {
      emit(HomeworkLoading());
      final result = await getHomeworkByClassUseCase(event.classId);
      result.fold(
        (failure) => emit(HomeworkError(failure.message)),
        (list) => emit(HomeworkListLoaded(
          classes: _classes,
          selectedClass: null,
          homeworkList: list,
        )),
      );
    });

    on<SelectHomeworkClassEvent>((event, emit) async {
      _selectedClass = event.selectedClass;
      emit(HomeworkLoading());
      final result = await getHomeworkByClassUseCase(event.selectedClass.id);
      result.fold(
        (failure) => emit(HomeworkError(failure.message)),
        (list) => emit(HomeworkListLoaded(
          classes: _classes,
          selectedClass: event.selectedClass,
          homeworkList: list,
        )),
      );
    });

    on<CreateHomeworkEvent>((event, emit) async {
      emit(HomeworkLoading());
      final result = await createHomeworkUseCase(
        CreateHomeworkParams(
          title: event.title,
          description: event.description,
          subject: event.subject,
          classId: event.classId,
          dueDate: event.dueDate,
          maxScore: event.maxScore,
        ),
      );
      result.fold(
        (failure) => emit(HomeworkError(failure.message)),
        (_) {
          emit(const HomeworkActionSuccess('Homework created successfully!'));
          if (_selectedClass != null) {
            add(SelectHomeworkClassEvent(_selectedClass!));
          }
        },
      );
    });

    on<LoadHomeworkSubmissionsEvent>((event, emit) async {
      emit(HomeworkLoading());
      final result = await getHomeworkSubmissionsUseCase(event.homeworkId);
      result.fold(
        (failure) => emit(HomeworkError(failure.message)),
        (subs) => emit(HomeworkSubmissionsLoaded(
          homeworkId: event.homeworkId,
          submissions: subs,
        )),
      );
    });

    on<GradeSubmissionEvent>((event, emit) async {
      emit(HomeworkLoading());
      final result = await gradeHomeworkSubmissionUseCase(
        GradeHomeworkSubmissionParams(
          submissionId: event.submissionId,
          score: event.score,
          feedback: event.feedback,
        ),
      );
      result.fold(
        (failure) => emit(HomeworkError(failure.message)),
        (_) {
          emit(const HomeworkActionSuccess('Grade recorded successfully!'));
          add(LoadHomeworkSubmissionsEvent(event.homeworkId));
        },
      );
    });

    on<SubmitStudentHomeworkEvent>((event, emit) async {
      emit(HomeworkLoading());
      final result = await submitHomeworkUseCase(
        SubmitHomeworkParams(
          homeworkId: event.homeworkId,
          studentId: event.studentId,
          content: event.content,
          fileUrl: event.fileUrl,
        ),
      );
      result.fold(
        (failure) => emit(HomeworkError(failure.message)),
        (_) => emit(const HomeworkActionSuccess('Homework submitted successfully!')),
      );
    });
  }
}
