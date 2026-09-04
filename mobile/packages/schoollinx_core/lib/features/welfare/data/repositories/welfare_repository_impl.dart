import 'package:dartz/dartz.dart';
import '../../../../core/errors/exceptions.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/clinic_visit_entity.dart';
import '../../domain/repositories/welfare_repository.dart';
import '../datasources/welfare_remote_data_source.dart';

class WelfareRepositoryImpl implements WelfareRepository {
  final WelfareRemoteDataSource remoteDataSource;
  WelfareRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Either<Failure, List<ClinicVisitEntity>>> getStudentClinicVisits(String studentId) async {
    try {
      final visits = await remoteDataSource.getStudentClinicVisits(studentId);
      return Right(visits);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<ClinicVisitEntity>>> getActiveClinicVisits() async {
    try {
      final visits = await remoteDataSource.getActiveClinicVisits();
      return Right(visits);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, ClinicVisitEntity>> logClinicVisit({
    required String studentId,
    required String triageLevel,
    required String symptoms,
    required String diagnosis,
    required String treatmentGiven,
    double? temperature,
    String? bloodPressure,
    int? heartRate,
  }) async {
    try {
      final visit = await remoteDataSource.logClinicVisit({
        'student_id': studentId,
        'triage_level': triageLevel,
        'symptoms': symptoms,
        'diagnosis': diagnosis,
        'treatment_given': treatmentGiven,
        'temperature': temperature,
        'blood_pressure': bloodPressure,
        'heart_rate': heartRate,
      });
      return Right(visit);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<HostelRoomEntity>>> getHostelRooms() async {
    try {
      final rooms = await remoteDataSource.getHostelRooms();
      return Right(rooms);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }
}
