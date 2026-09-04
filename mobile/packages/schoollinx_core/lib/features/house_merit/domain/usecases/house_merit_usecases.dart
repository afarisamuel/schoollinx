import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/house_merit_entity.dart';
import '../repositories/house_merit_repository.dart';

class GetHouseLeaderboardUseCase {
  final HouseMeritRepository repository;
  GetHouseLeaderboardUseCase(this.repository);

  Future<Either<Failure, List<SchoolHouseEntity>>> call() {
    return repository.getHouseLeaderboard();
  }
}

class GetStudentMeritHistoryUseCase {
  final HouseMeritRepository repository;
  GetStudentMeritHistoryUseCase(this.repository);

  Future<Either<Failure, List<StudentMeritRecordEntity>>> call(String studentId) {
    return repository.getStudentMeritHistory(studentId);
  }
}

class AwardMeritPointsUseCase {
  final HouseMeritRepository repository;
  AwardMeritPointsUseCase(this.repository);

  Future<Either<Failure, StudentMeritRecordEntity>> call({
    required String studentId,
    required String houseId,
    required int points,
    required String reason,
    required String category,
  }) {
    return repository.awardMeritPoints(
      studentId: studentId,
      houseId: houseId,
      points: points,
      reason: reason,
      category: category,
    );
  }
}
