import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../../core/usecases/usecase.dart';
import '../../../academics/domain/entities/teacher_entity.dart';
import '../../../academics/domain/usecases/academics_usecases.dart';
import '../../domain/entities/guardian_extra_entities.dart';
import '../../domain/usecases/guardian_usecases.dart';

// EVENTS
abstract class PtaEvent extends Equatable {
  const PtaEvent();
  @override
  List<Object?> get props => [];
}

class LoadPtaTeachersEvent extends PtaEvent {}

class SelectPtaTeacherEvent extends PtaEvent {
  final TeacherEntity teacher;
  const SelectPtaTeacherEvent(this.teacher);
  @override
  List<Object?> get props => [teacher];
}

class LoadTeacherSlotsEvent extends PtaEvent {
  final String teacherId;
  const LoadTeacherSlotsEvent(this.teacherId);
  @override
  List<Object?> get props => [teacherId];
}

class BookMeetingSlotEvent extends PtaEvent {
  final String slotId;
  final String guardianId;
  final String notes;
  final String teacherId;

  const BookMeetingSlotEvent({
    required this.slotId,
    required this.guardianId,
    required this.notes,
    required this.teacherId,
  });

  @override
  List<Object?> get props => [slotId, guardianId, notes, teacherId];
}

// STATES
abstract class PtaState extends Equatable {
  const PtaState();
  @override
  List<Object?> get props => [];
}

class PtaInitial extends PtaState {}
class PtaLoading extends PtaState {}

class PtaLoaded extends PtaState {
  final List<TeacherEntity> teachers;
  final TeacherEntity? selectedTeacher;
  final List<TeacherMeetingSlotEntity> slots;

  const PtaLoaded({
    required this.teachers,
    this.selectedTeacher,
    this.slots = const [],
  });

  PtaLoaded copyWith({
    List<TeacherEntity>? teachers,
    TeacherEntity? selectedTeacher,
    List<TeacherMeetingSlotEntity>? slots,
  }) {
    return PtaLoaded(
      teachers: teachers ?? this.teachers,
      selectedTeacher: selectedTeacher ?? this.selectedTeacher,
      slots: slots ?? this.slots,
    );
  }

  @override
  List<Object?> get props => [teachers, selectedTeacher, slots];
}

class PtaBookingSuccessState extends PtaState {
  final String message;
  const PtaBookingSuccessState(this.message);
  @override
  List<Object?> get props => [message];
}

class PtaError extends PtaState {
  final String message;
  const PtaError(this.message);
  @override
  List<Object?> get props => [message];
}

// BLOC
class PtaBloc extends Bloc<PtaEvent, PtaState> {
  final GetAllTeachersUseCase getAllTeachersUseCase;
  final GetTeacherMeetingSlotsUseCase getTeacherMeetingSlotsUseCase;
  final BookMeetingSlotUseCase bookMeetingSlotUseCase;

  List<TeacherEntity> _teachers = [];
  TeacherEntity? _selectedTeacher;
  List<TeacherMeetingSlotEntity> _slots = [];

  PtaBloc({
    required this.getAllTeachersUseCase,
    required this.getTeacherMeetingSlotsUseCase,
    required this.bookMeetingSlotUseCase,
  }) : super(PtaInitial()) {
    on<LoadPtaTeachersEvent>((event, emit) async {
      emit(PtaLoading());
      final result = await getAllTeachersUseCase(NoParams());
      await result.fold(
        (failure) async => emit(PtaError(failure.message)),
        (teachers) async {
          _teachers = teachers;
          if (teachers.isNotEmpty) {
            _selectedTeacher = teachers.first;
            final slotsRes = await getTeacherMeetingSlotsUseCase(teachers.first.id);
            _slots = slotsRes.fold((_) => [], (s) => s);
            emit(PtaLoaded(teachers: _teachers, selectedTeacher: _selectedTeacher, slots: _slots));
          } else {
            emit(const PtaLoaded(teachers: [], selectedTeacher: null, slots: []));
          }
        },
      );
    });

    on<SelectPtaTeacherEvent>((event, emit) async {
      _selectedTeacher = event.teacher;
      emit(PtaLoading());
      final result = await getTeacherMeetingSlotsUseCase(event.teacher.id);
      result.fold(
        (failure) => emit(PtaError(failure.message)),
        (slots) {
          _slots = slots;
          emit(PtaLoaded(teachers: _teachers, selectedTeacher: _selectedTeacher, slots: _slots));
        },
      );
    });

    on<LoadTeacherSlotsEvent>((event, emit) async {
      emit(PtaLoading());
      final result = await getTeacherMeetingSlotsUseCase(event.teacherId);
      result.fold(
        (failure) => emit(PtaError(failure.message)),
        (slots) {
          _slots = slots;
          emit(PtaLoaded(teachers: _teachers, selectedTeacher: _selectedTeacher, slots: slots));
        },
      );
    });

    on<BookMeetingSlotEvent>((event, emit) async {
      emit(PtaLoading());
      final result = await bookMeetingSlotUseCase(
        BookMeetingSlotParams(
          slotId: event.slotId,
          guardianId: event.guardianId,
          notes: event.notes,
        ),
      );
      result.fold(
        (failure) => emit(PtaError(failure.message)),
        (_) {
          emit(const PtaBookingSuccessState('1-on-1 PTA Conference booked successfully!'));
          add(LoadTeacherSlotsEvent(event.teacherId));
        },
      );
    });
  }
}
