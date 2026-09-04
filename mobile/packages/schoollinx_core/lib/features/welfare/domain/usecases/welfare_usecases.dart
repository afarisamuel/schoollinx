import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/clinic_visit_entity.dart';
import '../repositories/welfare_repository.dart';

class GetStudentClinicVisitsUseCase {
  final WelfareRepository repository;
  GetStudentClinicVisitsUseCase(this.repository);

  Future<Either<Failure, List<ClinicVisitEntity>>> call(String studentId) {
    return repository.getStudentClinicVisits(studentId);
  }
}

class GetActiveClinicVisitsUseCase {
  final WelfareRepository repository;
  GetActiveClinicVisitsUseCase(this.repository);

  Future<Either<Failure, List<ClinicVisitEntity>>> call() {
    return repository.getActiveClinicVisits();
  }
}

class LogClinicVisitUseCase {
  final WelfareRepository repository;
  LogClinicVisitUseCase(this.repository);

  Future<Either<Failure, ClinicVisitEntity>> call({
    required String studentId,
    required String triageLevel,
    required String symptoms,
    required String diagnosis,
    required String treatmentGiven,
    double? temperature,
    String? bloodPressure,
    int? heartRate,
  }) {
    return repository.logClinicVisit(
      studentId: studentId,
      triageLevel: triageLevel,
      symptoms: symptoms,
      diagnosis: diagnosis,
      treatmentGiven: treatmentGiven,
      temperature: temperature,
      bloodPressure: bloodPressure,
      heartRate: heartRate,
    );
  }
}

class GetHostelRoomsUseCase {
  final WelfareRepository repository;
  GetHostelRoomsUseCase(this.repository);

  Future<Either<Failure, List<HostelRoomEntity>>> call() {
    return repository.getHostelRooms();
  }
}
