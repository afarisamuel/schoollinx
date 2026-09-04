import '../../domain/entities/staff_leave_entity.dart';

class StaffLeaveModel extends StaffLeaveEntity {
  const StaffLeaveModel({
    required super.id,
    required super.staffId,
    required super.staffName,
    required super.leaveType,
    required super.startDate,
    required super.endDate,
    required super.daysCount,
    required super.reason,
    required super.status,
    super.rejectionReason,
    super.approvedBy,
    required super.createdAt,
  });

  factory StaffLeaveModel.fromJson(Map<String, dynamic> json) {
    return StaffLeaveModel(
      id: json['id'] ?? '',
      staffId: json['staff_id'] ?? '',
      staffName: json['staff_name'] ?? 'Staff Member',
      leaveType: json['leave_type'] ?? 'ANNUAL',
      startDate: json['start_date'] != null
          ? DateTime.tryParse(json['start_date']) ?? DateTime.now()
          : DateTime.now(),
      endDate: json['end_date'] != null
          ? DateTime.tryParse(json['end_date']) ?? DateTime.now()
          : DateTime.now(),
      daysCount: (json['days_count'] ?? 1) as int,
      reason: json['reason'] ?? '',
      status: json['status'] ?? 'PENDING',
      rejectionReason: json['rejection_reason'],
      approvedBy: json['approved_by'],
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at']) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'staff_id': staffId,
      'staff_name': staffName,
      'leave_type': leaveType,
      'start_date': startDate.toIso8601String(),
      'end_date': endDate.toIso8601String(),
      'days_count': daysCount,
      'reason': reason,
      'status': status,
      'rejection_reason': rejectionReason,
      'approved_by': approvedBy,
      'created_at': createdAt.toIso8601String(),
    };
  }
}

class PayslipModel extends PayslipEntity {
  const PayslipModel({
    required super.id,
    required super.staffId,
    required super.monthYear,
    required super.basicSalary,
    required super.allowances,
    required super.taxDeductions,
    required super.ssnitDeductions,
    required super.netPay,
    required super.status,
    required super.generatedAt,
  });

  factory PayslipModel.fromJson(Map<String, dynamic> json) {
    return PayslipModel(
      id: json['id'] ?? '',
      staffId: json['staff_id'] ?? '',
      monthYear: json['month_year'] ?? '',
      basicSalary: (json['basic_salary'] != null) ? (json['basic_salary'] as num).toDouble() : 0.0,
      allowances: (json['allowances'] != null) ? (json['allowances'] as num).toDouble() : 0.0,
      taxDeductions: (json['tax_deductions'] != null) ? (json['tax_deductions'] as num).toDouble() : 0.0,
      ssnitDeductions: (json['ssnit_deductions'] != null) ? (json['ssnit_deductions'] as num).toDouble() : 0.0,
      netPay: (json['net_pay'] != null) ? (json['net_pay'] as num).toDouble() : 0.0,
      status: json['status'] ?? 'GENERATED',
      generatedAt: json['generated_at'] != null
          ? DateTime.tryParse(json['generated_at']) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'staff_id': staffId,
      'month_year': monthYear,
      'basic_salary': basicSalary,
      'allowances': allowances,
      'tax_deductions': taxDeductions,
      'ssnit_deductions': ssnitDeductions,
      'net_pay': netPay,
      'status': status,
      'generated_at': generatedAt.toIso8601String(),
    };
  }
}
