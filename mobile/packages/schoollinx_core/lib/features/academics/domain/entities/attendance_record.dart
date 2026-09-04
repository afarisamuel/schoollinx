import 'package:equatable/equatable.dart';

class AttendanceRecord extends Equatable {
  final String id;
  final String studentId;
  final String classId;
  final String status; // PRESENT, ABSENT, LATE, EXCUSED, SICK_BAY
  final String? remarks;
  final DateTime date;

  const AttendanceRecord({
    this.id = '',
    required this.studentId,
    required this.classId,
    required this.status,
    this.remarks,
    required this.date,
  });

  AttendanceRecord copyWith({
    String? id,
    String? studentId,
    String? classId,
    String? status,
    String? remarks,
    DateTime? date,
  }) {
    return AttendanceRecord(
      id: id ?? this.id,
      studentId: studentId ?? this.studentId,
      classId: classId ?? this.classId,
      status: status ?? this.status,
      remarks: remarks ?? this.remarks,
      date: date ?? this.date,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'student_id': studentId,
      'class_id': classId,
      'status': status,
      'remarks': remarks ?? '',
      'date': date.toIso8601String().split('T').first,
    };
  }

  @override
  List<Object?> get props => [id, studentId, classId, status, remarks, date];
}
