import 'package:equatable/equatable.dart';

class StaffLeaveEntity extends Equatable {
  final String id;
  final String staffId;
  final String staffName;
  final String leaveType; // ANNUAL, SICK, MATERNITY, BEREAVEMENT, CASUAL
  final DateTime startDate;
  final DateTime endDate;
  final int daysCount;
  final String reason;
  final String status; // PENDING, APPROVED, REJECTED
  final String? rejectionReason;
  final String? approvedBy;
  final DateTime createdAt;

  const StaffLeaveEntity({
    required this.id,
    required this.staffId,
    required this.staffName,
    required this.leaveType,
    required this.startDate,
    required this.endDate,
    required this.daysCount,
    required this.reason,
    required this.status,
    this.rejectionReason,
    this.approvedBy,
    required this.createdAt,
  });

  @override
  List<Object?> get props => [
        id,
        staffId,
        staffName,
        leaveType,
        startDate,
        endDate,
        daysCount,
        reason,
        status,
        rejectionReason,
        approvedBy,
        createdAt,
      ];
}

class PayslipEntity extends Equatable {
  final String id;
  final String staffId;
  final String monthYear; // e.g. "September 2026"
  final double basicSalary;
  final double allowances;
  final double taxDeductions;
  final double ssnitDeductions;
  final double netPay;
  final String status; // GENERATED, PAID
  final DateTime generatedAt;

  const PayslipEntity({
    required this.id,
    required this.staffId,
    required this.monthYear,
    required this.basicSalary,
    required this.allowances,
    required this.taxDeductions,
    required this.ssnitDeductions,
    required this.netPay,
    required this.status,
    required this.generatedAt,
  });

  @override
  List<Object?> get props => [
        id,
        staffId,
        monthYear,
        basicSalary,
        allowances,
        taxDeductions,
        ssnitDeductions,
        netPay,
        status,
        generatedAt,
      ];
}
