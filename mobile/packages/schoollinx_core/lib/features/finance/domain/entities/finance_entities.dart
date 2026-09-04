import 'package:equatable/equatable.dart';

class FiscalSummaryEntity extends Equatable {
  final double totalRevenue;
  final double totalOutstanding;
  final double collectionRate;
  final double monthlyTarget;
  final int totalStudentsPaid;
  final int totalStudentsDefaulting;

  const FiscalSummaryEntity({
    required this.totalRevenue,
    required this.totalOutstanding,
    required this.collectionRate,
    required this.monthlyTarget,
    required this.totalStudentsPaid,
    required this.totalStudentsDefaulting,
  });

  @override
  List<Object?> get props => [
        totalRevenue,
        totalOutstanding,
        collectionRate,
        monthlyTarget,
        totalStudentsPaid,
        totalStudentsDefaulting,
      ];
}

class FeeRecordEntity extends Equatable {
  final String id;
  final String studentId;
  final String studentName;
  final String className;
  final String title;
  final double amountDue;
  final double amountPaid;
  final double balance;
  final String status; // 'PAID', 'PARTIAL', 'PENDING', 'OVERDUE'
  final DateTime dueDate;
  final String? paymentMethod;

  const FeeRecordEntity({
    required this.id,
    required this.studentId,
    required this.studentName,
    required this.className,
    required this.title,
    required this.amountDue,
    required this.amountPaid,
    required this.balance,
    required this.status,
    required this.dueDate,
    this.paymentMethod,
  });

  @override
  List<Object?> get props => [
        id,
        studentId,
        studentName,
        className,
        title,
        amountDue,
        amountPaid,
        balance,
        status,
        dueDate,
        paymentMethod,
      ];
}

class PaymentResponseEntity extends Equatable {
  final String authorizationUrl;
  final String accessCode;
  final String reference;

  const PaymentResponseEntity({
    required this.authorizationUrl,
    required this.accessCode,
    required this.reference,
  });

  @override
  List<Object?> get props => [authorizationUrl, accessCode, reference];
}
