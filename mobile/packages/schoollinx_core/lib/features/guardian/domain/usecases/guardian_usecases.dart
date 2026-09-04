import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../../../finance/domain/entities/finance_entities.dart';
import '../entities/child_entity.dart';
import '../entities/guardian_extra_entities.dart';
import '../repositories/guardian_repository.dart';

class GetChildrenUseCase implements UseCase<List<ChildEntity>, NoParams> {
  final GuardianRepository repository;
  GetChildrenUseCase(this.repository);
  @override
  Future<Either<Failure, List<ChildEntity>>> call(NoParams params) {
    return repository.getChildren();
  }
}

class GetChildAcademicsUseCase implements UseCase<Map<String, dynamic>, String> {
  final GuardianRepository repository;
  GetChildAcademicsUseCase(this.repository);
  @override
  Future<Either<Failure, Map<String, dynamic>>> call(String studentId) {
    return repository.getChildAcademics(studentId);
  }
}

class GetFamilyLedgerUseCase implements UseCase<List<FeeRecordEntity>, NoParams> {
  final GuardianRepository repository;
  GetFamilyLedgerUseCase(this.repository);
  @override
  Future<Either<Failure, List<FeeRecordEntity>>> call(NoParams params) {
    return repository.getFamilyLedger();
  }
}

class GetPickupPassUseCase implements UseCase<PickupPassEntity, String> {
  final GuardianRepository repository;
  GetPickupPassUseCase(this.repository);
  @override
  Future<Either<Failure, PickupPassEntity>> call(String childId) {
    return repository.getPickupPass(childId);
  }
}

class GeneratePickupOtpUseCase implements UseCase<String, String> {
  final GuardianRepository repository;
  GeneratePickupOtpUseCase(this.repository);
  @override
  Future<Either<Failure, String>> call(String childId) {
    return repository.generatePickupOTP(childId);
  }
}

class GetAbsenceRequestsUseCase implements UseCase<List<AbsenceRequestEntity>, NoParams> {
  final GuardianRepository repository;
  GetAbsenceRequestsUseCase(this.repository);
  @override
  Future<Either<Failure, List<AbsenceRequestEntity>>> call(NoParams params) {
    return repository.getAbsenceRequests();
  }
}

class SubmitAbsenceRequestParams {
  final String studentId;
  final String reason;
  final DateTime startDate;
  final DateTime endDate;

  SubmitAbsenceRequestParams({
    required this.studentId,
    required this.reason,
    required this.startDate,
    required this.endDate,
  });
}

class SubmitAbsenceRequestUseCase implements UseCase<void, SubmitAbsenceRequestParams> {
  final GuardianRepository repository;
  SubmitAbsenceRequestUseCase(this.repository);
  @override
  Future<Either<Failure, void>> call(SubmitAbsenceRequestParams params) {
    return repository.submitAbsenceRequest(
      studentId: params.studentId,
      reason: params.reason,
      startDate: params.startDate,
      endDate: params.endDate,
    );
  }
}

class GetStudentWalletUseCase implements UseCase<StudentWalletEntity, String> {
  final GuardianRepository repository;
  GetStudentWalletUseCase(this.repository);
  @override
  Future<Either<Failure, StudentWalletEntity>> call(String studentId) {
    return repository.getStudentWallet(studentId);
  }
}

class TopupStudentWalletParams {
  final String studentId;
  final double amount;
  final String paymentMethod;

  TopupStudentWalletParams({
    required this.studentId,
    required this.amount,
    required this.paymentMethod,
  });
}

class TopupStudentWalletUseCase implements UseCase<void, TopupStudentWalletParams> {
  final GuardianRepository repository;
  TopupStudentWalletUseCase(this.repository);
  @override
  Future<Either<Failure, void>> call(TopupStudentWalletParams params) {
    return repository.topupStudentWallet(
      studentId: params.studentId,
      amount: params.amount,
      paymentMethod: params.paymentMethod,
    );
  }
}

class GetTeacherMeetingSlotsUseCase implements UseCase<List<TeacherMeetingSlotEntity>, String> {
  final GuardianRepository repository;
  GetTeacherMeetingSlotsUseCase(this.repository);
  @override
  Future<Either<Failure, List<TeacherMeetingSlotEntity>>> call(String teacherId) {
    return repository.getTeacherMeetingSlots(teacherId);
  }
}

class BookMeetingSlotParams {
  final String slotId;
  final String guardianId;
  final String notes;

  BookMeetingSlotParams({
    required this.slotId,
    required this.guardianId,
    required this.notes,
  });
}

class BookMeetingSlotUseCase implements UseCase<void, BookMeetingSlotParams> {
  final GuardianRepository repository;
  BookMeetingSlotUseCase(this.repository);
  @override
  Future<Either<Failure, void>> call(BookMeetingSlotParams params) {
    return repository.bookMeeting(
      slotId: params.slotId,
      guardianId: params.guardianId,
      notes: params.notes,
    );
  }
}
