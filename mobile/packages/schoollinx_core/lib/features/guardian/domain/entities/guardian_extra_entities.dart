import 'package:equatable/equatable.dart';

class AbsenceRequestEntity extends Equatable {
  final String id;
  final String studentId;
  final String studentName;
  final String reason;
  final DateTime startDate;
  final DateTime endDate;
  final String status; // PENDING, APPROVED, REJECTED
  final String? reviewNotes;
  final DateTime createdAt;

  const AbsenceRequestEntity({
    required this.id,
    required this.studentId,
    required this.studentName,
    required this.reason,
    required this.startDate,
    required this.endDate,
    required this.status,
    this.reviewNotes,
    required this.createdAt,
  });

  @override
  List<Object?> get props => [id, studentId, studentName, reason, startDate, endDate, status, reviewNotes, createdAt];
}

class StudentWalletEntity extends Equatable {
  final String studentId;
  final double balance;
  final double dailyLimit;
  final List<WalletTransactionEntity> transactions;

  const StudentWalletEntity({
    required this.studentId,
    required this.balance,
    required this.dailyLimit,
    required this.transactions,
  });

  @override
  List<Object?> get props => [studentId, balance, dailyLimit, transactions];
}

class WalletTransactionEntity extends Equatable {
  final String id;
  final double amount;
  final String type; // CREDIT, DEBIT
  final String description;
  final DateTime timestamp;

  const WalletTransactionEntity({
    required this.id,
    required this.amount,
    required this.type,
    required this.description,
    required this.timestamp,
  });

  @override
  List<Object?> get props => [id, amount, type, description, timestamp];
}

class TeacherMeetingSlotEntity extends Equatable {
  final String id;
  final String teacherId;
  final String teacherName;
  final DateTime startTime;
  final DateTime endTime;
  final bool isBooked;

  const TeacherMeetingSlotEntity({
    required this.id,
    required this.teacherId,
    required this.teacherName,
    required this.startTime,
    required this.endTime,
    required this.isBooked,
  });

  @override
  List<Object?> get props => [id, teacherId, teacherName, startTime, endTime, isBooked];
}
