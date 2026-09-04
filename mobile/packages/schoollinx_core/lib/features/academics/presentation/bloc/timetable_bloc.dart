import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../domain/entities/timetable_entry_entity.dart';
import '../../domain/usecases/academics_usecases.dart';

// EVENTS
abstract class TimetableEvent extends Equatable {
  const TimetableEvent();
  @override
  List<Object?> get props => [];
}

class LoadClassTimetableEvent extends TimetableEvent {
  final String classId;
  const LoadClassTimetableEvent(this.classId);
  @override
  List<Object?> get props => [classId];
}

class LoadTeacherTimetableEvent extends TimetableEvent {
  final String teacherId;
  const LoadTeacherTimetableEvent(this.teacherId);
  @override
  List<Object?> get props => [teacherId];
}

class FilterTimetableByDayEvent extends TimetableEvent {
  final String dayOfWeek;
  const FilterTimetableByDayEvent(this.dayOfWeek);
  @override
  List<Object?> get props => [dayOfWeek];
}

// STATES
abstract class TimetableState extends Equatable {
  const TimetableState();
  @override
  List<Object?> get props => [];
}

class TimetableInitial extends TimetableState {}
class TimetableLoading extends TimetableState {}

class TimetableLoaded extends TimetableState {
  final List<TimetableEntryEntity> allEntries;
  final List<TimetableEntryEntity> filteredEntries;
  final String selectedDay;

  const TimetableLoaded({
    required this.allEntries,
    required this.filteredEntries,
    required this.selectedDay,
  });

  @override
  List<Object?> get props => [allEntries, filteredEntries, selectedDay];
}

class TimetableError extends TimetableState {
  final String message;
  const TimetableError(this.message);
  @override
  List<Object?> get props => [message];
}

// BLOC
class TimetableBloc extends Bloc<TimetableEvent, TimetableState> {
  final GetClassTimetableUseCase getClassTimetableUseCase;
  final GetTeacherTimetableUseCase getTeacherTimetableUseCase;

  List<TimetableEntryEntity> _cached = [];
  String _selectedDay = 'MONDAY';

  TimetableBloc({
    required this.getClassTimetableUseCase,
    required this.getTeacherTimetableUseCase,
  }) : super(TimetableInitial()) {
    on<LoadClassTimetableEvent>((event, emit) async {
      emit(TimetableLoading());
      final result = await getClassTimetableUseCase(event.classId);
      result.fold(
        (failure) => emit(TimetableError(failure.message)),
        (entries) {
          _cached = entries;
          final filtered = _filterByDay(entries, _selectedDay);
          emit(TimetableLoaded(
            allEntries: entries,
            filteredEntries: filtered,
            selectedDay: _selectedDay,
          ));
        },
      );
    });

    on<LoadTeacherTimetableEvent>((event, emit) async {
      emit(TimetableLoading());
      final result = await getTeacherTimetableUseCase(event.teacherId);
      result.fold(
        (failure) => emit(TimetableError(failure.message)),
        (entries) {
          _cached = entries;
          final filtered = _filterByDay(entries, _selectedDay);
          emit(TimetableLoaded(
            allEntries: entries,
            filteredEntries: filtered,
            selectedDay: _selectedDay,
          ));
        },
      );
    });

    on<FilterTimetableByDayEvent>((event, emit) {
      _selectedDay = event.dayOfWeek;
      if (_cached.isNotEmpty) {
        final filtered = _filterByDay(_cached, _selectedDay);
        emit(TimetableLoaded(
          allEntries: _cached,
          filteredEntries: filtered,
          selectedDay: _selectedDay,
        ));
      }
    });
  }

  List<TimetableEntryEntity> _filterByDay(List<TimetableEntryEntity> entries, String day) {
    return entries.where((e) => e.dayOfWeek.toUpperCase() == day.toUpperCase()).toList();
  }
}
