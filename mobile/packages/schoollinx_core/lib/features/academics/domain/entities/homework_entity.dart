import 'package:equatable/equatable.dart';

class HomeworkEntity extends Equatable {
  final String id;
  final String title;
  final String description;
  final String subject;
  final String classId;
  final String teacherName;
  final DateTime dueDate;
  final int maxScore;
  final bool isSubmitted;
  final double? score;
  final String? feedback;

  const HomeworkEntity({
    required this.id,
    required this.title,
    required this.description,
    required this.subject,
    required this.classId,
    required this.teacherName,
    required this.dueDate,
    this.maxScore = 100,
    this.isSubmitted = false,
    this.score,
    this.feedback,
  });

  @override
  List<Object?> get props => [
        id,
        title,
        description,
        subject,
        classId,
        teacherName,
        dueDate,
        maxScore,
        isSubmitted,
        score,
        feedback,
      ];
}
