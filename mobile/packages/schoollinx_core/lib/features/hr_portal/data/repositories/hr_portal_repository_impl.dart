import 'package:dartz/dartz.dart';
import '../../../../core/errors/exceptions.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/staff_leave_entity.dart';
import '../../domain/repositories/hr_portal_repository.dart';
import '../datasources/hr_portal_remote_data_source.dart';

class HrPortalRepositoryImpl implements HrPortalRepository {
  final HrPortalRemoteDataSource remoteDataSource;
  HrPortalRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Either<Failure, List<StaffLeaveEntity>>> getMyLeaveApplications() async {
    try {
      final leaves = await remoteDataSource.getMyLeaveApplications();
      return Right(leaves);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, StaffLeaveEntity>> applyForLeave({
    required String leaveType,
    required DateTime startDate,
    required DateTime endDate,
    required String reason,
  }) async {
    try {
      final daysCount = endDate.difference(startDate).inDays + 1;
      final leave = await remoteDataSource.applyForLeave({
        'leave_type': leaveType,
        'start_date': startDate.toIso8601String(),
        'end_date': endDate.toIso8601String(),
        'days_count': daysCount > 0 ? daysCount : 1,
        'reason': reason,
      });
      return Right(leave);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<PayslipEntity>>> getMyPayslips() async {
    try {
      final payslips = await remoteDataSource.getMyPayslips();
      return Right(payslips);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }
}
