import 'package:equatable/equatable.dart';

class DailyBillEntity extends Equatable {
  final String id;
  final String studentId;
  final String studentName;
  final String className;
  final String billType; // 'FEEDING', 'TRANSIT', 'WALK_IN'
  final double amount;
  final bool isCollected;
  final DateTime billDate;
  final String? collectedBy;

  const DailyBillEntity({
    required this.id,
    required this.studentId,
    required this.studentName,
    required this.className,
    required this.billType,
    required this.amount,
    required this.isCollected,
    required this.billDate,
    this.collectedBy,
  });

  @override
  List<Object?> get props => [id, studentId, studentName, className, billType, amount, isCollected, billDate, collectedBy];
}

class ShiftReconciliationEntity extends Equatable {
  final String shiftId;
  final DateTime shiftDate;
  final double physicalCashCounted;
  final double systemRecordedTotal;
  final double variance;
  final String status;
  final String cashierName;

  const ShiftReconciliationEntity({
    required this.shiftId,
    required this.shiftDate,
    required this.physicalCashCounted,
    required this.systemRecordedTotal,
    required this.variance,
    required this.status,
    required this.cashierName,
  });

  @override
  List<Object?> get props => [
    shiftId,
    shiftDate,
    physicalCashCounted,
    systemRecordedTotal,
    variance,
    status,
    cashierName,
  ];
}
