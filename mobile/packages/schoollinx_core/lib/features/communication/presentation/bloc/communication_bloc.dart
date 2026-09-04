import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../../core/usecases/usecase.dart';
import '../../domain/entities/notice_entity.dart';
import '../../domain/usecases/communication_usecases.dart';

// EVENTS
abstract class CommunicationEvent extends Equatable {
  const CommunicationEvent();
  @override
  List<Object?> get props => [];
}

class LoadNoticesEvent extends CommunicationEvent {}

class SendBroadcastAlertEvent extends CommunicationEvent {
  final String title;
  final String message;
  final String channel;
  final String targetRole;

  const SendBroadcastAlertEvent({
    required this.title,
    required this.message,
    required this.channel,
    required this.targetRole,
  });

  @override
  List<Object?> get props => [title, message, channel, targetRole];
}

class TriggerEmergencyLockdownBroadcastEvent extends CommunicationEvent {
  final String campusName;
  const TriggerEmergencyLockdownBroadcastEvent(this.campusName);
  @override
  List<Object?> get props => [campusName];
}

// STATES
abstract class CommunicationState extends Equatable {
  const CommunicationState();
  @override
  List<Object?> get props => [];
}

class CommunicationInitial extends CommunicationState {}
class CommunicationLoading extends CommunicationState {}

class CommunicationNoticesLoaded extends CommunicationState {
  final List<NoticeEntity> notices;
  const CommunicationNoticesLoaded(this.notices);
  @override
  List<Object?> get props => [notices];
}

class BroadcastSentSuccessState extends CommunicationState {
  final String message;
  const BroadcastSentSuccessState(this.message);
  @override
  List<Object?> get props => [message];
}

class EmergencyLockdownTriggeredState extends CommunicationState {
  final String campusName;
  final DateTime timestamp;
  const EmergencyLockdownTriggeredState({required this.campusName, required this.timestamp});
  @override
  List<Object?> get props => [campusName, timestamp];
}

class CommunicationError extends CommunicationState {
  final String message;
  const CommunicationError(this.message);
  @override
  List<Object?> get props => [message];
}

// BLOC
class CommunicationBloc extends Bloc<CommunicationEvent, CommunicationState> {
  final GetNoticesUseCase getNoticesUseCase;
  final SendBroadcastUseCase sendBroadcastUseCase;

  CommunicationBloc({
    required this.getNoticesUseCase,
    required this.sendBroadcastUseCase,
  }) : super(CommunicationInitial()) {
    on<LoadNoticesEvent>((event, emit) async {
      emit(CommunicationLoading());
      final result = await getNoticesUseCase(NoParams());
      result.fold(
        (failure) => emit(CommunicationError(failure.message)),
        (notices) => emit(CommunicationNoticesLoaded(notices)),
      );
    });

    on<SendBroadcastAlertEvent>((event, emit) async {
      emit(CommunicationLoading());
      final result = await sendBroadcastUseCase(
        SendBroadcastParams(
          title: event.title,
          message: event.message,
          channel: event.channel,
          targetRole: event.targetRole,
        ),
      );
      result.fold(
        (failure) => emit(CommunicationError(failure.message)),
        (success) {
          if (success) {
            emit(const BroadcastSentSuccessState('Broadcast dispatched across Push, SMS & Web channels successfully!'));
            add(LoadNoticesEvent());
          } else {
            emit(const CommunicationError('Failed to dispatch broadcast.'));
          }
        },
      );
    });

    on<TriggerEmergencyLockdownBroadcastEvent>((event, emit) async {
      emit(CommunicationLoading());
      final result = await sendBroadcastUseCase(
        SendBroadcastParams(
          title: '🚨 EMERGENCY CAMPUS LOCKDOWN PROTOCOL INITIATED',
          message: 'Immediate safety lockdown active for ${event.campusName}. All students and faculty are in designated safe zones. Stand by for verified updates.',
          channel: 'ALL',
          targetRole: 'ALL',
        ),
      );
      result.fold(
        (failure) => emit(CommunicationError(failure.message)),
        (_) {
          emit(EmergencyLockdownTriggeredState(
            campusName: event.campusName,
            timestamp: DateTime.now(),
          ));
          add(LoadNoticesEvent());
        },
      );
    });
  }
}
