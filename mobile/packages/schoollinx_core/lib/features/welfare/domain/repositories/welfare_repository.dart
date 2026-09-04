import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/clinic_visit_entity.dart';

abstract class WelfareRepository {
  Future<Either<Failure, List<ClinicVisitEntity>>> getStudentClinicVisits(String studentId);
  Future<Either<Failure, List<ClinicVisitEntity>>> getActiveClinicVisits();
  Future<Either<Failure, ClinicVisitEntity>> logClinicVisit({
    required String studentId,
    required String triageLevel,
    required String symptoms,
    required String diagnosis,
    required String treatmentGiven,
    double? temperature,
    String? bloodPressure,
    int? heartRate,
  });
  Future<Either<Failure, List<HostelRoomEntity>>> getHostelRooms();
}
