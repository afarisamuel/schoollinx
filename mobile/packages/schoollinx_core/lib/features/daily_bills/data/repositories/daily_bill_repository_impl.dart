import 'package:dartz/dartz.dart';
import '../../../../core/errors/exceptions.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/daily_bill_entity.dart';
import '../../domain/repositories/daily_bill_repository.dart';
import '../datasources/daily_bill_remote_datasource.dart';

class DailyBillRepositoryImpl implements DailyBillRepository {
  final DailyBillRemoteDataSource remoteDataSource;

  DailyBillRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Either<Failure, List<DailyBillEntity>>> getPendingDailyBills({String? routeId, String? classId}) async {
    try {
      final bills = await remoteDataSource.getPendingDailyBills(routeId: routeId, classId: classId);
      return Right(bills);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<DailyBillEntity>>> getMyCollections() async {
    try {
      final collections = await remoteDataSource.getMyCollections();
      return Right(collections);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> collectDailyBill({required String billId, required String paymentMethod}) async {
    try {
      await remoteDataSource.collectDailyBill(billId: billId, paymentMethod: paymentMethod);
      return const Right(null);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, ShiftReconciliationEntity>> reconcileShift({
    required double physicalCashCounted,
    required String notes,
  }) async {
    try {
      final result = await remoteDataSource.reconcileShift(
        physicalCashCounted: physicalCashCounted,
        notes: notes,
      );
      return Right(result);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }
}
