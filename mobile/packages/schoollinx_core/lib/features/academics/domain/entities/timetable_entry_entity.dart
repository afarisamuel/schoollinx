import 'package:equatable/equatable.dart';

class TimetableEntryEntity extends Equatable {
  final String id;
  final String dayOfWeek;
  final String startTime;
  final String endTime;
  final String subject;
  final String teacherName;
  final String room;
  final String classId;

  const TimetableEntryEntity({
    required this.id,
    required this.dayOfWeek,
    required this.startTime,
    required this.endTime,
    required this.subject,
    required this.teacherName,
    required this.room,
    required this.classId,
  });

  @override
  List<Object?> get props => [
        id,
        dayOfWeek,
        startTime,
        endTime,
        subject,
        teacherName,
        room,
        classId,
      ];
}
