import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../../core/usecases/usecase.dart';
import '../../domain/entities/academic_class_entity.dart';
import '../../domain/entities/grade_record.dart';
import '../../domain/entities/student_entity.dart';
import '../../domain/usecases/academics_usecases.dart';

// EVENTS
abstract class GradingEvent extends Equatable {
  const GradingEvent();
  @override
  List<Object?> get props => [];
}

class LoadGradingClassesEvent extends GradingEvent {}

class SelectGradingClassEvent extends GradingEvent {
  final AcademicClassEntity selectedClass;
  final String subject;
  final String term;
  final String academicYear;

  const SelectGradingClassEvent({
    required this.selectedClass,
    required this.subject,
    this.term = 'TERM_1',
    this.academicYear = '2025/2026',
  });

  @override
  List<Object?> get props => [selectedClass, subject, term, academicYear];
}

class UpdateStudentGradeEvent extends GradingEvent {
  final String studentId;
  final double? classScore;
  final double? examScore;
  final String? remarks;

  const UpdateStudentGradeEvent({
    required this.studentId,
    this.classScore,
    this.examScore,
    this.remarks,
  });

  @override
  List<Object?> get props => [studentId, classScore, examScore, remarks];
}

class AttachVoiceRemarkEvent extends GradingEvent {
  final String studentId;
  final String voiceTranscription;

  const AttachVoiceRemarkEvent({
    required this.studentId,
    required this.voiceTranscription,
  });

  @override
  List<Object?> get props => [studentId, voiceTranscription];
}

class SubmitGradesEvent extends GradingEvent {}

// STATES
abstract class GradingState extends Equatable {
  const GradingState();
  @override
  List<Object?> get props => [];
}

class GradingInitial extends GradingState {}
class GradingLoading extends GradingState {}

class GradingRosterLoaded extends GradingState {
  final List<AcademicClassEntity> classes;
  final AcademicClassEntity selectedClass;
  final String subject;
  final String term;
  final String academicYear;
  final List<StudentEntity> students;
  final Map<String, GradeRecord> gradesMap;

  const GradingRosterLoaded({
    required this.classes,
    required this.selectedClass,
    required this.subject,
    required this.term,
    required this.academicYear,
    required this.students,
    required this.gradesMap,
  });

  double get classAverage {
    if (gradesMap.isEmpty) return 0.0;
    final scores = gradesMap.values.map((g) => g.totalScore).where((s) => s > 0);
    if (scores.isEmpty) return 0.0;
    return scores.reduce((a, b) => a + b) / scores.length;
  }

  GradingRosterLoaded copyWith({
    List<AcademicClassEntity>? classes,
    AcademicClassEntity? selectedClass,
    String? subject,
    String? term,
    String? academicYear,
    List<StudentEntity>? students,
    Map<String, GradeRecord>? gradesMap,
  }) {
    return GradingRosterLoaded(
      classes: classes ?? this.classes,
      selectedClass: selectedClass ?? this.selectedClass,
      subject: subject ?? this.subject,
      term: term ?? this.term,
      academicYear: academicYear ?? this.academicYear,
      students: students ?? this.students,
      gradesMap: gradesMap ?? this.gradesMap,
    );
  }

  @override
  List<Object?> get props => [classes, selectedClass, subject, term, academicYear, students, gradesMap];
}

class GradesSubmittedSuccess extends GradingState {
  final int count;
  const GradesSubmittedSuccess(this.count);
  @override
  List<Object?> get props => [count];
}

class GradingError extends GradingState {
  final String message;
  const GradingError(this.message);
  @override
  List<Object?> get props => [message];
}

// BLOC
class GradingBloc extends Bloc<GradingEvent, GradingState> {
  final GetClassesUseCase getClassesUseCase;
  final GetStudentsByClassUseCase getStudentsByClassUseCase;
  final SaveGradesUseCase saveGradesUseCase;

  List<AcademicClassEntity> _classes = [];
  AcademicClassEntity? _selectedClass;
  String _subject = 'Mathematics';
  String _term = 'TERM_1';
  String _academicYear = '2025/2026';
  List<StudentEntity> _students = [];
  final Map<String, GradeRecord> _gradesMap = {};

  GradingBloc({
    required this.getClassesUseCase,
    required this.getStudentsByClassUseCase,
    required this.saveGradesUseCase,
  }) : super(GradingInitial()) {
    on<LoadGradingClassesEvent>((event, emit) async {
      emit(GradingLoading());
      final result = await getClassesUseCase(NoParams());
      result.fold(
        (failure) => emit(GradingError(failure.message)),
        (classes) {
          _classes = classes;
          if (classes.isNotEmpty) {
            add(SelectGradingClassEvent(
              selectedClass: classes.first,
              subject: _subject,
              term: _term,
              academicYear: _academicYear,
            ));
          }
        },
      );
    });

    on<SelectGradingClassEvent>((event, emit) async {
      _selectedClass = event.selectedClass;
      _subject = event.subject;
      _term = event.term;
      _academicYear = event.academicYear;
      emit(GradingLoading());

      final result = await getStudentsByClassUseCase(event.selectedClass.id);
      result.fold(
        (failure) => emit(GradingError(failure.message)),
        (students) {
          _students = students;
          _gradesMap.clear();
          for (final s in students) {
            _gradesMap[s.id] = GradeRecord(
              studentId: s.id,
              classId: _selectedClass!.id,
              subject: _subject,
              term: _term,
              academicYear: _academicYear,
              classScore: 0,
              examScore: 0,
              remarks: 'Good effort',
            );
          }
          emit(GradingRosterLoaded(
            classes: _classes,
            selectedClass: event.selectedClass,
            subject: _subject,
            term: _term,
            academicYear: _academicYear,
            students: _students,
            gradesMap: Map.from(_gradesMap),
          ));
        },
      );
    });

    on<UpdateStudentGradeEvent>((event, emit) {
      if (state is GradingRosterLoaded) {
        final current = state as GradingRosterLoaded;
        final updatedMap = Map<String, GradeRecord>.from(current.gradesMap);
        final existing = updatedMap[event.studentId] ??
            GradeRecord(
              studentId: event.studentId,
              classId: current.selectedClass.id,
              subject: current.subject,
              term: current.term,
              academicYear: current.academicYear,
              classScore: 0,
              examScore: 0,
            );

        updatedMap[event.studentId] = existing.copyWith(
          classScore: event.classScore ?? existing.classScore,
          examScore: event.examScore ?? existing.examScore,
          remarks: event.remarks ?? existing.remarks,
        );
        emit(current.copyWith(gradesMap: updatedMap));
      }
    });

    on<AttachVoiceRemarkEvent>((event, emit) {
      if (state is GradingRosterLoaded) {
        final current = state as GradingRosterLoaded;
        final updatedMap = Map<String, GradeRecord>.from(current.gradesMap);
        final existing = updatedMap[event.studentId];
        if (existing != null) {
          updatedMap[event.studentId] = existing.copyWith(
            remarks: event.voiceTranscription,
          );
          emit(current.copyWith(gradesMap: updatedMap));
        }
      }
    });

    on<SubmitGradesEvent>((event, emit) async {
      if (state is! GradingRosterLoaded || _selectedClass == null) return;
      final current = state as GradingRosterLoaded;
      emit(GradingLoading());

      final records = current.gradesMap.values.toList();
      final result = await saveGradesUseCase(records);
      result.fold(
        (failure) => emit(GradingError(failure.message)),
        (_) {
          emit(GradesSubmittedSuccess(records.length));
          add(SelectGradingClassEvent(
            selectedClass: _selectedClass!,
            subject: _subject,
            term: _term,
            academicYear: _academicYear,
          ));
        },
      );
    });
  }
}
