import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/staff_leave_entity.dart';
import '../../domain/usecases/hr_portal_usecases.dart';

// Events
abstract class HrPortalEvent extends Equatable {
  const HrPortalEvent();
  @override
  List<Object?> get props => [];
}

class LoadMyLeavesEvent extends HrPortalEvent {
  const LoadMyLeavesEvent();
}

class ApplyLeaveEvent extends HrPortalEvent {
  final String leaveType;
  final DateTime startDate;
  final DateTime endDate;
  final String reason;

  const ApplyLeaveEvent({
    required this.leaveType,
    required this.startDate,
    required this.endDate,
    required this.reason,
  });

  @override
  List<Object?> get props => [leaveType, startDate, endDate, reason];
}

class LoadMyPayslipsEvent extends HrPortalEvent {
  const LoadMyPayslipsEvent();
}

// States
abstract class HrPortalState extends Equatable {
  const HrPortalState();
  @override
  List<Object?> get props => [];
}

class HrPortalInitialState extends HrPortalState {}

class HrPortalLoadingState extends HrPortalState {}

class MyLeavesLoadedState extends HrPortalState {
  final List<StaffLeaveEntity> leaves;
  const MyLeavesLoadedState(this.leaves);
  @override
  List<Object?> get props => [leaves];
}

class LeaveAppliedState extends HrPortalState {
  final StaffLeaveEntity leave;
  const LeaveAppliedState(this.leave);
  @override
  List<Object?> get props => [leave];
}

class MyPayslipsLoadedState extends HrPortalState {
  final List<PayslipEntity> payslips;
  const MyPayslipsLoadedState(this.payslips);
  @override
  List<Object?> get props => [payslips];
}

class HrPortalErrorState extends HrPortalState {
  final String message;
  const HrPortalErrorState(this.message);
  @override
  List<Object?> get props => [message];
}

// BLoC
class HrPortalBloc extends Bloc<HrPortalEvent, HrPortalState> {
  final GetMyLeaveApplicationsUseCase getMyLeaveApplications;
  final ApplyForLeaveUseCase applyForLeave;
  final GetMyPayslipsUseCase getMyPayslips;

  HrPortalBloc({
    required this.getMyLeaveApplications,
    required this.applyForLeave,
    required this.getMyPayslips,
  }) : super(HrPortalInitialState()) {
    on<LoadMyLeavesEvent>((event, emit) async {
      emit(HrPortalLoadingState());
      final result = await getMyLeaveApplications();
      result.fold(
        (failure) => emit(HrPortalErrorState(failure.message)),
        (leaves) => emit(MyLeavesLoadedState(leaves)),
      );
    });

    on<ApplyLeaveEvent>((event, emit) async {
      emit(HrPortalLoadingState());
      final result = await applyForLeave(
        leaveType: event.leaveType,
        startDate: event.startDate,
        endDate: event.endDate,
        reason: event.reason,
      );
      result.fold(
        (failure) => emit(HrPortalErrorState(failure.message)),
        (leave) => emit(LeaveAppliedState(leave)),
      );
    });

    on<LoadMyPayslipsEvent>((event, emit) async {
      emit(HrPortalLoadingState());
      final result = await getMyPayslips();
      result.fold(
        (failure) => emit(HrPortalErrorState(failure.message)),
        (payslips) => emit(MyPayslipsLoadedState(payslips)),
      );
    });
  }
}
