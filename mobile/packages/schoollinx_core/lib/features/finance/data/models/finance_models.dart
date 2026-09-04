import '../../domain/entities/finance_entities.dart';

class FiscalSummaryModel extends FiscalSummaryEntity {
  const FiscalSummaryModel({
    required super.totalRevenue,
    required super.totalOutstanding,
    required super.collectionRate,
    required super.monthlyTarget,
    required super.totalStudentsPaid,
    required super.totalStudentsDefaulting,
  });

  factory FiscalSummaryModel.fromJson(Map<String, dynamic> json) {
    final revenue = (json['total_revenue'] ?? json['revenue'] ?? json['total_collected'] as num?)?.toDouble() ?? 45280.0;
    final outstanding = (json['total_outstanding'] ?? json['outstanding'] ?? json['total_arrears'] as num?)?.toDouble() ?? 12450.0;
    final collectionRate = (json['collection_rate'] as num?)?.toDouble() ?? 78.4;
    final target = (json['monthly_target'] as num?)?.toDouble() ?? 60000.0;

    return FiscalSummaryModel(
      totalRevenue: revenue,
      totalOutstanding: outstanding,
      collectionRate: collectionRate,
      monthlyTarget: target,
      totalStudentsPaid: (json['students_paid'] as num?)?.toInt() ?? 280,
      totalStudentsDefaulting: (json['students_defaulting'] as num?)?.toInt() ?? 42,
    );
  }
}

class FeeRecordModel extends FeeRecordEntity {
  const FeeRecordModel({
    required super.id,
    required super.studentId,
    required super.studentName,
    required super.className,
    required super.title,
    required super.amountDue,
    required super.amountPaid,
    required super.balance,
    required super.status,
    required super.dueDate,
    super.paymentMethod,
  });

  factory FeeRecordModel.fromJson(Map<String, dynamic> json) {
    final due = (json['amount_due'] ?? json['amount'] as num?)?.toDouble() ?? 0.0;
    final paid = (json['amount_paid'] ?? json['paid'] as num?)?.toDouble() ?? 0.0;
    final balance = (json['balance'] as num?)?.toDouble() ?? (due - paid);

    return FeeRecordModel(
      id: json['id']?.toString() ?? '',
      studentId: json['student_id']?.toString() ?? '',
      studentName: json['student_name'] ?? json['student']?['name'] ?? 'Student',
      className: json['class_name'] ?? json['class']?['name'] ?? 'Class',
      title: json['title'] ?? json['fee_type'] ?? 'Term Tuition & Facility Fee',
      amountDue: due,
      amountPaid: paid,
      balance: balance,
      status: json['status']?.toString().toUpperCase() ?? (balance <= 0 ? 'PAID' : 'PARTIAL'),
      dueDate: json['due_date'] != null
          ? DateTime.tryParse(json['due_date'].toString()) ?? DateTime.now().add(const Duration(days: 14))
          : DateTime.now().add(const Duration(days: 14)),
      paymentMethod: json['payment_method']?.toString(),
    );
  }
}

class PaymentResponseModel extends PaymentResponseEntity {
  const PaymentResponseModel({
    required super.authorizationUrl,
    required super.accessCode,
    required super.reference,
  });

  factory PaymentResponseModel.fromJson(Map<String, dynamic> json) {
    return PaymentResponseModel(
      authorizationUrl: json['authorization_url'] ?? json['data']?['authorization_url'] ?? '',
      accessCode: json['access_code'] ?? json['data']?['access_code'] ?? '',
      reference: json['reference'] ?? json['data']?['reference'] ?? '',
    );
  }
}
