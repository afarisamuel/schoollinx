import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../../core/usecases/usecase.dart';
import '../../domain/entities/academic_class_entity.dart';
import '../../domain/entities/attendance_record.dart';
import '../../domain/entities/student_entity.dart';
import '../../domain/usecases/academics_usecases.dart';

// EVENTS
abstract class AttendanceEvent extends Equatable {
  const AttendanceEvent();
  @override
  List<Object?> get props => [];
}

class LoadAttendanceClassesEvent extends AttendanceEvent {}

class SelectAttendanceClassEvent extends AttendanceEvent {
  final AcademicClassEntity selectedClass;
  const SelectAttendanceClassEvent(this.selectedClass);
  @override
  List<Object?> get props => [selectedClass];
}

class ToggleStudentAttendanceStatusEvent extends AttendanceEvent {
  final String studentId;
  final String newStatus;
  const ToggleStudentAttendanceStatusEvent({required this.studentId, required this.newStatus});
  @override
  List<Object?> get props => [studentId, newStatus];
}

class MarkAllAttendanceEvent extends AttendanceEvent {
  final String status;
  const MarkAllAttendanceEvent(this.status);
  @override
  List<Object?> get props => [status];
}

class SubmitAttendanceEvent extends AttendanceEvent {
  final DateTime date;
  final String? remarks;
  const SubmitAttendanceEvent({required this.date, this.remarks});
  @override
  List<Object?> get props => [date, remarks];
}

// STATES
abstract class AttendanceState extends Equatable {
  const AttendanceState();
  @override
  List<Object?> get props => [];
}

class AttendanceInitial extends AttendanceState {}
class AttendanceLoading extends AttendanceState {}

class AttendanceClassesLoaded extends AttendanceState {
  final List<AcademicClassEntity> classes;
  const AttendanceClassesLoaded(this.classes);
  @override
  List<Object?> get props => [classes];
}

class AttendanceRosterLoaded extends AttendanceState {
  final List<AcademicClassEntity> classes;
  final AcademicClassEntity selectedClass;
  final List<StudentEntity> students;
  final Map<String, String> statusMap;

  const AttendanceRosterLoaded({
    required this.classes,
    required this.selectedClass,
    required this.students,
    required this.statusMap,
  });

  int get presentCount => statusMap.values.where((s) => s == 'PRESENT').length;
  int get absentCount => statusMap.values.where((s) => s == 'ABSENT').length;
  int get lateCount => statusMap.values.where((s) => s == 'LATE').length;
  int get sickBayCount => statusMap.values.where((s) => s == 'SICK_BAY').length;

  AttendanceRosterLoaded copyWith({
    List<AcademicClassEntity>? classes,
    AcademicClassEntity? selectedClass,
    List<StudentEntity>? students,
    Map<String, String>? statusMap,
  }) {
    return AttendanceRosterLoaded(
      classes: classes ?? this.classes,
      selectedClass: selectedClass ?? this.selectedClass,
      students: students ?? this.students,
      statusMap: statusMap ?? this.statusMap,
    );
  }

  @override
  List<Object?> get props => [classes, selectedClass, students, statusMap];
}

class AttendanceSubmittedSuccess extends AttendanceState {
  final int count;
  const AttendanceSubmittedSuccess(this.count);
  @override
  List<Object?> get props => [count];
}

class AttendanceError extends AttendanceState {
  final String message;
  const AttendanceError(this.message);
  @override
  List<Object?> get props => [message];
}

// BLOC
class AttendanceBloc extends Bloc<AttendanceEvent, AttendanceState> {
  final GetClassesUseCase getClassesUseCase;
  final GetStudentsByClassUseCase getStudentsByClassUseCase;
  final MarkBulkAttendanceUseCase markBulkAttendanceUseCase;

  List<AcademicClassEntity> _classes = [];
  AcademicClassEntity? _selectedClass;
  List<StudentEntity> _students = [];
  final Map<String, String> _statusMap = {};

  AttendanceBloc({
    required this.getClassesUseCase,
    required this.getStudentsByClassUseCase,
    required this.markBulkAttendanceUseCase,
  }) : super(AttendanceInitial()) {
    on<LoadAttendanceClassesEvent>((event, emit) async {
      emit(AttendanceLoading());
      final result = await getClassesUseCase(NoParams());
      result.fold(
        (failure) => emit(AttendanceError(failure.message)),
        (classes) {
          _classes = classes;
          if (classes.isNotEmpty) {
            add(SelectAttendanceClassEvent(classes.first));
          } else {
            emit(AttendanceClassesLoaded(classes));
          }
        },
      );
    });

    on<SelectAttendanceClassEvent>((event, emit) async {
      _selectedClass = event.selectedClass;
      emit(AttendanceLoading());
      final result = await getStudentsByClassUseCase(event.selectedClass.id);
      result.fold(
        (failure) => emit(AttendanceError(failure.message)),
        (students) {
          _students = students;
          _statusMap.clear();
          for (final s in students) {
            _statusMap[s.id] = 'PRESENT';
          }
          emit(AttendanceRosterLoaded(
            classes: _classes,
            selectedClass: event.selectedClass,
            students: _students,
            statusMap: Map.from(_statusMap),
          ));
        },
      );
    });

    on<ToggleStudentAttendanceStatusEvent>((event, emit) {
      if (state is AttendanceRosterLoaded) {
        final current = state as AttendanceRosterLoaded;
        final updatedMap = Map<String, String>.from(current.statusMap);
        updatedMap[event.studentId] = event.newStatus;
        emit(current.copyWith(statusMap: updatedMap));
      }
    });

    on<MarkAllAttendanceEvent>((event, emit) {
      if (state is AttendanceRosterLoaded) {
        final current = state as AttendanceRosterLoaded;
        final updatedMap = <String, String>{};
        for (final s in current.students) {
          updatedMap[s.id] = event.status;
        }
        emit(current.copyWith(statusMap: updatedMap));
      }
    });

    on<SubmitAttendanceEvent>((event, emit) async {
      if (state is! AttendanceRosterLoaded || _selectedClass == null) return;
      final current = state as AttendanceRosterLoaded;
      emit(AttendanceLoading());

      final records = current.students.map((s) {
        return AttendanceRecord(
          id: '',
          studentId: s.id,
          classId: _selectedClass!.id,
          date: event.date,
          status: current.statusMap[s.id] ?? 'PRESENT',
          remarks: event.remarks,
        );
      }).toList();

      final result = await markBulkAttendanceUseCase(records);
      result.fold(
        (failure) => emit(AttendanceError(failure.message)),
        (_) {
          emit(AttendanceSubmittedSuccess(records.length));
          add(SelectAttendanceClassEvent(_selectedClass!));
        },
      );
    });
  }
}
