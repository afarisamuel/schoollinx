import 'package:dartz/dartz.dart';
import '../../../../core/errors/exceptions.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/finance_entities.dart';
import '../../domain/repositories/finance_repository.dart';
import '../datasources/finance_remote_datasource.dart';

class FinanceRepositoryImpl implements FinanceRepository {
  final FinanceRemoteDataSource remoteDataSource;

  FinanceRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Either<Failure, FiscalSummaryEntity>> getFiscalSummary() async {
    try {
      final summary = await remoteDataSource.getFiscalSummary();
      return Right(summary);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<FeeRecordEntity>>> getFeeRecords({String? studentId, String? status}) async {
    try {
      final records = await remoteDataSource.getFeeRecords(studentId: studentId, status: status);
      return Right(records);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<FeeRecordEntity>>> getDefaulters() async {
    try {
      final defaulters = await remoteDataSource.getDefaulters();
      return Right(defaulters);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, PaymentResponseEntity>> initializePayment({
    required double amount,
    required String email,
    required String feeRecordId,
    required String channel,
  }) async {
    try {
      final result = await remoteDataSource.initializePayment(
        amount: amount,
        email: email,
        feeRecordId: feeRecordId,
        channel: channel,
      );
      return Right(result);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, bool>> verifyPayment(String reference) async {
    try {
      final verified = await remoteDataSource.verifyPayment(reference);
      return Right(verified);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> sendDefaultersDunningSms({
    required List<String> studentIds,
    required String messageTemplate,
  }) async {
    try {
      await remoteDataSource.sendDefaultersDunningSms(
        studentIds: studentIds,
        messageTemplate: messageTemplate,
      );
      return const Right(null);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }
}
