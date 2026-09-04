import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/house_merit_entity.dart';

abstract class HouseMeritRepository {
  Future<Either<Failure, List<SchoolHouseEntity>>> getHouseLeaderboard();
  Future<Either<Failure, List<StudentMeritRecordEntity>>> getStudentMeritHistory(String studentId);
  Future<Either<Failure, StudentMeritRecordEntity>> awardMeritPoints({
    required String studentId,
    required String houseId,
    required int points,
    required String reason,
    required String category,
  });
}
