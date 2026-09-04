import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/clinic_visit_entity.dart';
import '../../domain/usecases/welfare_usecases.dart';

// Events
abstract class WelfareEvent extends Equatable {
  const WelfareEvent();
  @override
  List<Object?> get props => [];
}

class LoadStudentClinicVisitsEvent extends WelfareEvent {
  final String studentId;
  const LoadStudentClinicVisitsEvent(this.studentId);
  @override
  List<Object?> get props => [studentId];
}

class LoadActiveClinicVisitsEvent extends WelfareEvent {
  const LoadActiveClinicVisitsEvent();
}

class LoadHostelRoomsEvent extends WelfareEvent {
  const LoadHostelRoomsEvent();
}

class SubmitClinicVisitEvent extends WelfareEvent {
  final String studentId;
  final String triageLevel;
  final String symptoms;
  final String diagnosis;
  final String treatmentGiven;
  final double? temperature;
  final String? bloodPressure;
  final int? heartRate;

  const SubmitClinicVisitEvent({
    required this.studentId,
    required this.triageLevel,
    required this.symptoms,
    required this.diagnosis,
    required this.treatmentGiven,
    this.temperature,
    this.bloodPressure,
    this.heartRate,
  });

  @override
  List<Object?> get props => [
        studentId,
        triageLevel,
        symptoms,
        diagnosis,
        treatmentGiven,
        temperature,
        bloodPressure,
        heartRate,
      ];
}

// States
abstract class WelfareState extends Equatable {
  const WelfareState();
  @override
  List<Object?> get props => [];
}

class WelfareInitialState extends WelfareState {}

class WelfareLoadingState extends WelfareState {}

class StudentClinicVisitsLoadedState extends WelfareState {
  final List<ClinicVisitEntity> visits;
  const StudentClinicVisitsLoadedState(this.visits);
  @override
  List<Object?> get props => [visits];
}

class ActiveClinicVisitsLoadedState extends WelfareState {
  final List<ClinicVisitEntity> visits;
  const ActiveClinicVisitsLoadedState(this.visits);
  @override
  List<Object?> get props => [visits];
}

class HostelRoomsLoadedState extends WelfareState {
  final List<HostelRoomEntity> rooms;
  const HostelRoomsLoadedState(this.rooms);
  @override
  List<Object?> get props => [rooms];
}

class ClinicVisitSubmittedState extends WelfareState {
  final ClinicVisitEntity visit;
  const ClinicVisitSubmittedState(this.visit);
  @override
  List<Object?> get props => [visit];
}

class WelfareErrorState extends WelfareState {
  final String message;
  const WelfareErrorState(this.message);
  @override
  List<Object?> get props => [message];
}

// BLoC
class WelfareBloc extends Bloc<WelfareEvent, WelfareState> {
  final GetStudentClinicVisitsUseCase getStudentClinicVisits;
  final GetActiveClinicVisitsUseCase getActiveClinicVisits;
  final LogClinicVisitUseCase logClinicVisit;
  final GetHostelRoomsUseCase getHostelRooms;

  WelfareBloc({
    required this.getStudentClinicVisits,
    required this.getActiveClinicVisits,
    required this.logClinicVisit,
    required this.getHostelRooms,
  }) : super(WelfareInitialState()) {
    on<LoadStudentClinicVisitsEvent>((event, emit) async {
      emit(WelfareLoadingState());
      final result = await getStudentClinicVisits(event.studentId);
      result.fold(
        (failure) => emit(WelfareErrorState(failure.message)),
        (visits) => emit(StudentClinicVisitsLoadedState(visits)),
      );
    });

    on<LoadActiveClinicVisitsEvent>((event, emit) async {
      emit(WelfareLoadingState());
      final result = await getActiveClinicVisits();
      result.fold(
        (failure) => emit(WelfareErrorState(failure.message)),
        (visits) => emit(ActiveClinicVisitsLoadedState(visits)),
      );
    });

    on<LoadHostelRoomsEvent>((event, emit) async {
      emit(WelfareLoadingState());
      final result = await getHostelRooms();
      result.fold(
        (failure) => emit(WelfareErrorState(failure.message)),
        (rooms) => emit(HostelRoomsLoadedState(rooms)),
      );
    });

    on<SubmitClinicVisitEvent>((event, emit) async {
      emit(WelfareLoadingState());
      final result = await logClinicVisit(
        studentId: event.studentId,
        triageLevel: event.triageLevel,
        symptoms: event.symptoms,
        diagnosis: event.diagnosis,
        treatmentGiven: event.treatmentGiven,
        temperature: event.temperature,
        bloodPressure: event.bloodPressure,
        heartRate: event.heartRate,
      );
      result.fold(
        (failure) => emit(WelfareErrorState(failure.message)),
        (visit) => emit(ClinicVisitSubmittedState(visit)),
      );
    });
  }
}
