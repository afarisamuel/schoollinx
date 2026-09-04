import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/staff_leave_entity.dart';
import '../repositories/hr_portal_repository.dart';

class GetMyLeaveApplicationsUseCase {
  final HrPortalRepository repository;
  GetMyLeaveApplicationsUseCase(this.repository);

  Future<Either<Failure, List<StaffLeaveEntity>>> call() {
    return repository.getMyLeaveApplications();
  }
}

class ApplyForLeaveUseCase {
  final HrPortalRepository repository;
  ApplyForLeaveUseCase(this.repository);

  Future<Either<Failure, StaffLeaveEntity>> call({
    required String leaveType,
    required DateTime startDate,
    required DateTime endDate,
    required String reason,
  }) {
    return repository.applyForLeave(
      leaveType: leaveType,
      startDate: startDate,
      endDate: endDate,
      reason: reason,
    );
  }
}

class GetMyPayslipsUseCase {
  final HrPortalRepository repository;
  GetMyPayslipsUseCase(this.repository);

  Future<Either<Failure, List<PayslipEntity>>> call() {
    return repository.getMyPayslips();
  }
}
