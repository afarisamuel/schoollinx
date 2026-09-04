import 'package:dartz/dartz.dart';
import '../../../../core/errors/exceptions.dart';
import '../../../../core/errors/failures.dart';
import '../../../finance/domain/entities/finance_entities.dart';
import '../../domain/entities/child_entity.dart';
import '../../domain/entities/guardian_extra_entities.dart';
import '../../domain/repositories/guardian_repository.dart';
import '../datasources/guardian_remote_datasource.dart';

class GuardianRepositoryImpl implements GuardianRepository {
  final GuardianRemoteDataSource remoteDataSource;

  GuardianRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Either<Failure, List<ChildEntity>>> getChildren() async {
    try {
      final children = await remoteDataSource.getChildren();
      return Right(children);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, Map<String, dynamic>>> getChildAcademics(String studentId) async {
    try {
      final data = await remoteDataSource.getChildAcademics(studentId);
      return Right(data);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<FeeRecordEntity>>> getFamilyLedger() async {
    try {
      final ledger = await remoteDataSource.getFamilyLedger();
      return Right(ledger);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, PickupPassEntity>> getPickupPass(String childId) async {
    try {
      final pass = await remoteDataSource.getPickupPass(childId);
      return Right(pass);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, String>> generatePickupOTP(String childId) async {
    try {
      final otp = await remoteDataSource.generatePickupOTP(childId);
      return Right(otp);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<AbsenceRequestEntity>>> getAbsenceRequests() async {
    try {
      final reqs = await remoteDataSource.getAbsenceRequests();
      return Right(reqs);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> submitAbsenceRequest({
    required String studentId,
    required String reason,
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    try {
      await remoteDataSource.submitAbsenceRequest(
        studentId: studentId,
        reason: reason,
        startDate: startDate,
        endDate: endDate,
      );
      return const Right(null);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, StudentWalletEntity>> getStudentWallet(String studentId) async {
    try {
      final wallet = await remoteDataSource.getStudentWallet(studentId);
      return Right(wallet);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> topupStudentWallet({
    required String studentId,
    required double amount,
    required String paymentMethod,
  }) async {
    try {
      await remoteDataSource.topupStudentWallet(
        studentId: studentId,
        amount: amount,
        paymentMethod: paymentMethod,
      );
      return const Right(null);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<TeacherMeetingSlotEntity>>> getTeacherMeetingSlots(String teacherId) async {
    try {
      final slots = await remoteDataSource.getTeacherMeetingSlots(teacherId);
      return Right(slots);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> bookMeeting({
    required String slotId,
    required String guardianId,
    required String notes,
  }) async {
    try {
      await remoteDataSource.bookMeeting(
        slotId: slotId,
        guardianId: guardianId,
        notes: notes,
      );
      return const Right(null);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }
}
