import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/staff_leave_entity.dart';

abstract class HrPortalRepository {
  Future<Either<Failure, List<StaffLeaveEntity>>> getMyLeaveApplications();
  Future<Either<Failure, StaffLeaveEntity>> applyForLeave({
    required String leaveType,
    required DateTime startDate,
    required DateTime endDate,
    required String reason,
  });
  Future<Either<Failure, List<PayslipEntity>>> getMyPayslips();
}
