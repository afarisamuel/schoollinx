import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../../core/usecases/usecase.dart';
import '../../domain/entities/guardian_extra_entities.dart';
import '../../domain/usecases/guardian_usecases.dart';

// EVENTS
abstract class AbsenceEvent extends Equatable {
  const AbsenceEvent();
  @override
  List<Object?> get props => [];
}

class LoadAbsenceRequestsEvent extends AbsenceEvent {}

class SubmitAbsenceExcuseEvent extends AbsenceEvent {
  final String studentId;
  final String reason;
  final DateTime startDate;
  final DateTime endDate;
  final String? medicalNoteAttachment;

  const SubmitAbsenceExcuseEvent({
    required this.studentId,
    required this.reason,
    required this.startDate,
    required this.endDate,
    this.medicalNoteAttachment,
  });

  @override
  List<Object?> get props => [studentId, reason, startDate, endDate, medicalNoteAttachment];
}

// STATES
abstract class AbsenceState extends Equatable {
  const AbsenceState();
  @override
  List<Object?> get props => [];
}

class AbsenceInitial extends AbsenceState {}
class AbsenceLoading extends AbsenceState {}

class AbsenceRequestsLoaded extends AbsenceState {
  final List<AbsenceRequestEntity> requests;
  const AbsenceRequestsLoaded(this.requests);
  @override
  List<Object?> get props => [requests];
}

class AbsenceSubmittedSuccessState extends AbsenceState {
  final String message;
  const AbsenceSubmittedSuccessState(this.message);
  @override
  List<Object?> get props => [message];
}

class AbsenceError extends AbsenceState {
  final String message;
  const AbsenceError(this.message);
  @override
  List<Object?> get props => [message];
}

// BLOC
class AbsenceBloc extends Bloc<AbsenceEvent, AbsenceState> {
  final GetAbsenceRequestsUseCase getAbsenceRequestsUseCase;
  final SubmitAbsenceRequestUseCase submitAbsenceRequestUseCase;

  AbsenceBloc({
    required this.getAbsenceRequestsUseCase,
    required this.submitAbsenceRequestUseCase,
  }) : super(AbsenceInitial()) {
    on<LoadAbsenceRequestsEvent>((event, emit) async {
      emit(AbsenceLoading());
      final result = await getAbsenceRequestsUseCase(NoParams());
      result.fold(
        (failure) => emit(AbsenceError(failure.message)),
        (requests) => emit(AbsenceRequestsLoaded(requests)),
      );
    });

    on<SubmitAbsenceExcuseEvent>((event, emit) async {
      emit(AbsenceLoading());
      final result = await submitAbsenceRequestUseCase(
        SubmitAbsenceRequestParams(
          studentId: event.studentId,
          reason: event.reason,
          startDate: event.startDate,
          endDate: event.endDate,
        ),
      );
      result.fold(
        (failure) => emit(AbsenceError(failure.message)),
        (_) {
          emit(const AbsenceSubmittedSuccessState('Absence excuse filed successfully with the school administration.'));
          add(LoadAbsenceRequestsEvent());
        },
      );
    });
  }
}
