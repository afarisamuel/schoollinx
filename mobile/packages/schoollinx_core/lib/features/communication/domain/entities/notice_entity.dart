import 'package:equatable/equatable.dart';

class NoticeEntity extends Equatable {
  final String id;
  final String title;
  final String message;
  final String channel; // 'SMS', 'PUSH', 'WHATSAPP', 'EMAIL'
  final String targetRole; // 'ALL', 'PARENTS', 'TEACHERS', 'STUDENTS'
  final DateTime createdAt;
  final String authorName;

  const NoticeEntity({
    required this.id,
    required this.title,
    required this.message,
    required this.channel,
    required this.targetRole,
    required this.createdAt,
    required this.authorName,
  });

  @override
  List<Object?> get props => [id, title, message, channel, targetRole, createdAt, authorName];
}
