import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../../../finance/domain/entities/finance_entities.dart';
import '../entities/child_entity.dart';
import '../entities/guardian_extra_entities.dart';

abstract class GuardianRepository {
  Future<Either<Failure, List<ChildEntity>>> getChildren();
  Future<Either<Failure, Map<String, dynamic>>> getChildAcademics(String studentId);
  Future<Either<Failure, List<FeeRecordEntity>>> getFamilyLedger();
  Future<Either<Failure, PickupPassEntity>> getPickupPass(String childId);
  Future<Either<Failure, String>> generatePickupOTP(String childId);
  
  // Absence Requests
  Future<Either<Failure, List<AbsenceRequestEntity>>> getAbsenceRequests();
  Future<Either<Failure, void>> submitAbsenceRequest({
    required String studentId,
    required String reason,
    required DateTime startDate,
    required DateTime endDate,
  });

  // Digital Wallet
  Future<Either<Failure, StudentWalletEntity>> getStudentWallet(String studentId);
  Future<Either<Failure, void>> topupStudentWallet({
    required String studentId,
    required double amount,
    required String paymentMethod,
  });

  // PTA Meeting Bookings
  Future<Either<Failure, List<TeacherMeetingSlotEntity>>> getTeacherMeetingSlots(String teacherId);
  Future<Either<Failure, void>> bookMeeting({
    required String slotId,
    required String guardianId,
    required String notes,
  });
}
