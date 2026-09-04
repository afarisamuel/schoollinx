import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/finance_entities.dart';

abstract class FinanceRepository {
  Future<Either<Failure, FiscalSummaryEntity>> getFiscalSummary();
  Future<Either<Failure, List<FeeRecordEntity>>> getFeeRecords({String? studentId, String? status});
  Future<Either<Failure, PaymentResponseEntity>> initializePayment({
    required double amount,
    required String email,
    required String feeRecordId,
    required String channel,
  });
  Future<Either<Failure, bool>> verifyPayment(String reference);
  Future<Either<Failure, List<FeeRecordEntity>>> getDefaulters();
  Future<Either<Failure, void>> sendDefaultersDunningSms({
    required List<String> studentIds,
    required String messageTemplate,
  });
}
