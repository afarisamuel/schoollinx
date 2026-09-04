import 'package:equatable/equatable.dart';

class HomeworkSubmissionEntity extends Equatable {
  final String id;
  final String homeworkId;
  final String studentId;
  final String studentName;
  final String className;
  final String content;
  final String? fileUrl;
  final DateTime submittedAt;
  final double? score;
  final String? feedback;

  const HomeworkSubmissionEntity({
    required this.id,
    required this.homeworkId,
    required this.studentId,
    required this.studentName,
    required this.className,
    required this.content,
    this.fileUrl,
    required this.submittedAt,
    this.score,
    this.feedback,
  });

  @override
  List<Object?> get props => [id, homeworkId, studentId, studentName, className, content, fileUrl, submittedAt, score, feedback];
}

class LibraryBookEntity extends Equatable {
  final String id;
  final String title;
  final String author;
  final String isbn;
  final String category;
  final bool isAvailable;
  final int copiesAvailable;

  const LibraryBookEntity({
    required this.id,
    required this.title,
    required this.author,
    required this.isbn,
    required this.category,
    required this.isAvailable,
    required this.copiesAvailable,
  });

  @override
  List<Object?> get props => [id, title, author, isbn, category, isAvailable, copiesAvailable];
}

class CBTQuestionEntity extends Equatable {
  final String id;
  final String questionText;
  final List<String> options;
  final int correctOptionIndex;
  final String explanation;

  const CBTQuestionEntity({
    required this.id,
    required this.questionText,
    required this.options,
    required this.correctOptionIndex,
    required this.explanation,
  });

  @override
  List<Object?> get props => [id, questionText, options, correctOptionIndex, explanation];
}

class CBTQuizEntity extends Equatable {
  final String id;
  final String title;
  final String subject;
  final int durationMinutes;
  final int totalQuestions;
  final bool isCompleted;
  final double? scorePercentage;

  const CBTQuizEntity({
    required this.id,
    required this.title,
    required this.subject,
    required this.durationMinutes,
    required this.totalQuestions,
    this.isCompleted = false,
    this.scorePercentage,
  });

  @override
  List<Object?> get props => [id, title, subject, durationMinutes, totalQuestions, isCompleted, scorePercentage];
}
