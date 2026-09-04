import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/daily_bill_entity.dart';

abstract class DailyBillRepository {
  Future<Either<Failure, List<DailyBillEntity>>> getPendingDailyBills({String? routeId, String? classId});
  Future<Either<Failure, List<DailyBillEntity>>> getMyCollections();
  Future<Either<Failure, void>> collectDailyBill({required String billId, required String paymentMethod});
  Future<Either<Failure, ShiftReconciliationEntity>> reconcileShift({
    required double physicalCashCounted,
    required String notes,
  });
}
