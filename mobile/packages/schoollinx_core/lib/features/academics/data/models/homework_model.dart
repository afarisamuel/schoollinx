import '../../domain/entities/homework_entity.dart';

class HomeworkModel extends HomeworkEntity {
  const HomeworkModel({
    required super.id,
    required super.title,
    required super.description,
    required super.subject,
    required super.classId,
    required super.teacherName,
    required super.dueDate,
    super.maxScore = 100,
    super.isSubmitted = false,
    super.score,
    super.feedback,
  });

  factory HomeworkModel.fromJson(Map<String, dynamic> json) {
    return HomeworkModel(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? json['assignment_title'] ?? '',
      description: json['description'] ?? json['instructions'] ?? '',
      subject: json['subject_name'] ?? json['subject'] ?? 'General',
      classId: json['class_id']?.toString() ?? '',
      teacherName: json['teacher_name'] ?? 'Class Teacher',
      dueDate: json['due_date'] != null
          ? DateTime.tryParse(json['due_date'].toString()) ?? DateTime.now().add(const Duration(days: 2))
          : DateTime.now().add(const Duration(days: 2)),
      maxScore: json['max_score'] is int ? json['max_score'] : (json['max_score'] as num?)?.toInt() ?? 100,
      isSubmitted: json['is_submitted'] ?? (json['submissions'] != null && (json['submissions'] as List).isNotEmpty),
      score: (json['score'] as num?)?.toDouble(),
      feedback: json['feedback']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'subject': subject,
      'class_id': classId,
      'teacher_name': teacherName,
      'due_date': dueDate.toIso8601String(),
      'max_score': maxScore,
      'is_submitted': isSubmitted,
      'score': score,
      'feedback': feedback,
    };
  }
}
