import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../../core/usecases/usecase.dart';
import '../../domain/entities/daily_bill_entity.dart';
import '../../domain/usecases/daily_bills_usecases.dart';

// EVENTS
abstract class DailyBillsEvent extends Equatable {
  const DailyBillsEvent();
  @override
  List<Object?> get props => [];
}

class LoadDailyBillsEvent extends DailyBillsEvent {
  final String? routeId;
  final String? classId;
  const LoadDailyBillsEvent({this.routeId, this.classId});
  @override
  List<Object?> get props => [routeId, classId];
}

class LoadMyCollectionsEvent extends DailyBillsEvent {}

class CollectBillPaymentEvent extends DailyBillsEvent {
  final String billId;
  final String paymentMethod;
  const CollectBillPaymentEvent({required this.billId, required this.paymentMethod});
  @override
  List<Object?> get props => [billId, paymentMethod];
}

class ReconcileDailyShiftEvent extends DailyBillsEvent {
  final double physicalCash;
  final String notes;
  const ReconcileDailyShiftEvent({required this.physicalCash, required this.notes});
  @override
  List<Object?> get props => [physicalCash, notes];
}

// STATES
abstract class DailyBillsState extends Equatable {
  const DailyBillsState();
  @override
  List<Object?> get props => [];
}

class DailyBillsInitial extends DailyBillsState {}
class DailyBillsLoading extends DailyBillsState {}

class DailyBillsLoaded extends DailyBillsState {
  final List<DailyBillEntity> pendingBills;
  final List<DailyBillEntity> myCollections;
  final double totalPendingAmount;
  final double totalCollectedAmount;

  const DailyBillsLoaded({
    required this.pendingBills,
    required this.myCollections,
    required this.totalPendingAmount,
    required this.totalCollectedAmount,
  });

  @override
  List<Object?> get props => [pendingBills, myCollections, totalPendingAmount, totalCollectedAmount];
}

class BillCollectedSuccessState extends DailyBillsState {
  final String billId;
  const BillCollectedSuccessState(this.billId);
  @override
  List<Object?> get props => [billId];
}

class ShiftReconciledSuccessState extends DailyBillsState {
  final ShiftReconciliationEntity reconciliation;
  const ShiftReconciledSuccessState(this.reconciliation);
  @override
  List<Object?> get props => [reconciliation];
}

class DailyBillsError extends DailyBillsState {
  final String message;
  const DailyBillsError(this.message);
  @override
  List<Object?> get props => [message];
}

// BLOC
class DailyBillsBloc extends Bloc<DailyBillsEvent, DailyBillsState> {
  final GetPendingDailyBillsUseCase getPendingDailyBillsUseCase;
  final GetMyDailyCollectionsUseCase getMyDailyCollectionsUseCase;
  final CollectDailyBillUseCase collectDailyBillUseCase;
  final ReconcileShiftUseCase reconcileShiftUseCase;

  List<DailyBillEntity> _pending = [];
  List<DailyBillEntity> _collected = [];

  DailyBillsBloc({
    required this.getPendingDailyBillsUseCase,
    required this.getMyDailyCollectionsUseCase,
    required this.collectDailyBillUseCase,
    required this.reconcileShiftUseCase,
  }) : super(DailyBillsInitial()) {
    on<LoadDailyBillsEvent>((event, emit) async {
      emit(DailyBillsLoading());
      final pendingResult = await getPendingDailyBillsUseCase(
        GetPendingDailyBillsParams(routeId: event.routeId, classId: event.classId),
      );
      final collectedResult = await getMyDailyCollectionsUseCase(NoParams());

      pendingResult.fold(
        (failure) => emit(DailyBillsError(failure.message)),
        (pending) {
          _pending = pending;
          collectedResult.fold(
            (_) {
              final totalPending = _pending.fold<double>(0, (sum, b) => sum + b.amount);
              emit(DailyBillsLoaded(
                pendingBills: _pending,
                myCollections: _collected,
                totalPendingAmount: totalPending,
                totalCollectedAmount: 0,
              ));
            },
            (collected) {
              _collected = collected;
              final totalPending = _pending.fold<double>(0, (sum, b) => sum + b.amount);
              final totalCollected = _collected.fold<double>(0, (sum, b) => sum + b.amount);
              emit(DailyBillsLoaded(
                pendingBills: _pending,
                myCollections: _collected,
                totalPendingAmount: totalPending,
                totalCollectedAmount: totalCollected,
              ));
            },
          );
        },
      );
    });

    on<CollectBillPaymentEvent>((event, emit) async {
      emit(DailyBillsLoading());
      final result = await collectDailyBillUseCase(
        CollectDailyBillParams(billId: event.billId, paymentMethod: event.paymentMethod),
      );
      result.fold(
        (failure) => emit(DailyBillsError(failure.message)),
        (_) {
          emit(BillCollectedSuccessState(event.billId));
          add(const LoadDailyBillsEvent());
        },
      );
    });

    on<ReconcileDailyShiftEvent>((event, emit) async {
      emit(DailyBillsLoading());
      final result = await reconcileShiftUseCase(
        ReconcileShiftParams(
          physicalCashCounted: event.physicalCash,
          notes: event.notes,
        ),
      );
      result.fold(
        (failure) => emit(DailyBillsError(failure.message)),
        (recon) {
          emit(ShiftReconciledSuccessState(recon));
          add(const LoadDailyBillsEvent());
        },
      );
    });
  }
}
