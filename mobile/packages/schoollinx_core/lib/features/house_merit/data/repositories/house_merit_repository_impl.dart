import 'package:dartz/dartz.dart';
import '../../../../core/errors/exceptions.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/house_merit_entity.dart';
import '../../domain/repositories/house_merit_repository.dart';
import '../datasources/house_merit_remote_data_source.dart';

class HouseMeritRepositoryImpl implements HouseMeritRepository {
  final HouseMeritRemoteDataSource remoteDataSource;
  HouseMeritRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Either<Failure, List<SchoolHouseEntity>>> getHouseLeaderboard() async {
    try {
      final houses = await remoteDataSource.getHouseLeaderboard();
      return Right(houses);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<StudentMeritRecordEntity>>> getStudentMeritHistory(String studentId) async {
    try {
      final merits = await remoteDataSource.getStudentMeritHistory(studentId);
      return Right(merits);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, StudentMeritRecordEntity>> awardMeritPoints({
    required String studentId,
    required String houseId,
    required int points,
    required String reason,
    required String category,
  }) async {
    try {
      final record = await remoteDataSource.awardMeritPoints({
        'student_id': studentId,
        'house_id': houseId,
        'points': points,
        'reason': reason,
        'category': category,
      });
      return Right(record);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }
}
