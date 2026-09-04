import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/finance_entities.dart';
import '../repositories/finance_repository.dart';

class GetFiscalSummaryUseCase implements UseCase<FiscalSummaryEntity, NoParams> {
  final FinanceRepository repository;

  GetFiscalSummaryUseCase(this.repository);

  @override
  Future<Either<Failure, FiscalSummaryEntity>> call(NoParams params) {
    return repository.getFiscalSummary();
  }
}

class GetFeeRecordsParams {
  final String? studentId;
  final String? status;

  const GetFeeRecordsParams({this.studentId, this.status});
}

class GetFeeRecordsUseCase implements UseCase<List<FeeRecordEntity>, GetFeeRecordsParams> {
  final FinanceRepository repository;

  GetFeeRecordsUseCase(this.repository);

  @override
  Future<Either<Failure, List<FeeRecordEntity>>> call(GetFeeRecordsParams params) {
    return repository.getFeeRecords(studentId: params.studentId, status: params.status);
  }
}

class GetDefaultersUseCase implements UseCase<List<FeeRecordEntity>, NoParams> {
  final FinanceRepository repository;

  GetDefaultersUseCase(this.repository);

  @override
  Future<Either<Failure, List<FeeRecordEntity>>> call(NoParams params) {
    return repository.getDefaulters();
  }
}

class SendDefaultersDunningParams {
  final List<String> studentIds;
  final String messageTemplate;

  SendDefaultersDunningParams({required this.studentIds, required this.messageTemplate});
}

class SendDefaultersDunningSmsUseCase implements UseCase<void, SendDefaultersDunningParams> {
  final FinanceRepository repository;

  SendDefaultersDunningSmsUseCase(this.repository);

  @override
  Future<Either<Failure, void>> call(SendDefaultersDunningParams params) {
    return repository.sendDefaultersDunningSms(
      studentIds: params.studentIds,
      messageTemplate: params.messageTemplate,
    );
  }
}

class InitializePaymentParams {
  final double amount;
  final String email;
  final String feeRecordId;
  final String channel;

  InitializePaymentParams({
    required this.amount,
    required this.email,
    required this.feeRecordId,
    required this.channel,
  });
}

class InitializePaymentUseCase implements UseCase<PaymentResponseEntity, InitializePaymentParams> {
  final FinanceRepository repository;

  InitializePaymentUseCase(this.repository);

  @override
  Future<Either<Failure, PaymentResponseEntity>> call(InitializePaymentParams params) {
    return repository.initializePayment(
      amount: params.amount,
      email: params.email,
      feeRecordId: params.feeRecordId,
      channel: params.channel,
    );
  }
}

class VerifyPaymentUseCase implements UseCase<bool, String> {
  final FinanceRepository repository;

  VerifyPaymentUseCase(this.repository);

  @override
  Future<Either<Failure, bool>> call(String reference) {
    return repository.verifyPayment(reference);
  }
}
