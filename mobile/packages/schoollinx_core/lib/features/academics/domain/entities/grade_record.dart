import 'package:equatable/equatable.dart';

class GradeRecord extends Equatable {
  final String id;
  final String studentId;
  final String classId;
  final String subject;
  final String term;
  final String academicYear;
  final double classScore;
  final double examScore;
  final double totalScore;
  final String? grade;
  final String? remarks;

  const GradeRecord({
    this.id = '',
    required this.studentId,
    required this.classId,
    this.subject = 'General',
    this.term = 'TERM_1',
    this.academicYear = '2025/2026',
    required this.classScore,
    required this.examScore,
    double? totalScore,
    this.grade,
    this.remarks,
  }) : totalScore = totalScore ?? (classScore + examScore);

  GradeRecord copyWith({
    String? id,
    String? studentId,
    String? classId,
    String? subject,
    String? term,
    String? academicYear,
    double? classScore,
    double? examScore,
    double? totalScore,
    String? grade,
    String? remarks,
  }) {
    final newClassScore = classScore ?? this.classScore;
    final newExamScore = examScore ?? this.examScore;
    return GradeRecord(
      id: id ?? this.id,
      studentId: studentId ?? this.studentId,
      classId: classId ?? this.classId,
      subject: subject ?? this.subject,
      term: term ?? this.term,
      academicYear: academicYear ?? this.academicYear,
      classScore: newClassScore,
      examScore: newExamScore,
      totalScore: totalScore ?? (newClassScore + newExamScore),
      grade: grade ?? this.grade,
      remarks: remarks ?? this.remarks,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'student_id': studentId,
      'class_id': classId,
      'subject': subject,
      'term': term,
      'academic_year': academicYear,
      'class_score': classScore,
      'exam_score': examScore,
      'total_score': totalScore,
      'remarks': remarks,
    };
  }

  @override
  List<Object?> get props => [
    id,
    studentId,
    classId,
    subject,
    term,
    academicYear,
    classScore,
    examScore,
    totalScore,
    grade,
    remarks,
  ];
}
