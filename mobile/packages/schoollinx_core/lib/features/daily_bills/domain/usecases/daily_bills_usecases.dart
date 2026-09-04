import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/daily_bill_entity.dart';
import '../repositories/daily_bill_repository.dart';

class GetPendingDailyBillsParams {
  final String? routeId;
  final String? classId;
  GetPendingDailyBillsParams({this.routeId, this.classId});
}

class GetPendingDailyBillsUseCase implements UseCase<List<DailyBillEntity>, GetPendingDailyBillsParams> {
  final DailyBillRepository repository;
  GetPendingDailyBillsUseCase(this.repository);
  @override
  Future<Either<Failure, List<DailyBillEntity>>> call(GetPendingDailyBillsParams params) {
    return repository.getPendingDailyBills(routeId: params.routeId, classId: params.classId);
  }
}

class GetMyDailyCollectionsUseCase implements UseCase<List<DailyBillEntity>, NoParams> {
  final DailyBillRepository repository;
  GetMyDailyCollectionsUseCase(this.repository);
  @override
  Future<Either<Failure, List<DailyBillEntity>>> call(NoParams params) {
    return repository.getMyCollections();
  }
}

class CollectDailyBillParams {
  final String billId;
  final String paymentMethod;
  CollectDailyBillParams({required this.billId, required this.paymentMethod});
}

class CollectDailyBillUseCase implements UseCase<void, CollectDailyBillParams> {
  final DailyBillRepository repository;
  CollectDailyBillUseCase(this.repository);
  @override
  Future<Either<Failure, void>> call(CollectDailyBillParams params) {
    return repository.collectDailyBill(billId: params.billId, paymentMethod: params.paymentMethod);
  }
}

class ReconcileShiftParams {
  final double physicalCashCounted;
  final String notes;
  ReconcileShiftParams({required this.physicalCashCounted, required this.notes});
}

class ReconcileShiftUseCase implements UseCase<ShiftReconciliationEntity, ReconcileShiftParams> {
  final DailyBillRepository repository;
  ReconcileShiftUseCase(this.repository);
  @override
  Future<Either<Failure, ShiftReconciliationEntity>> call(ReconcileShiftParams params) {
    return repository.reconcileShift(
      physicalCashCounted: params.physicalCashCounted,
      notes: params.notes,
    );
  }
}
