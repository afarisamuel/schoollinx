import '../../domain/entities/timetable_entry_entity.dart';

class TimetableModel extends TimetableEntryEntity {
  const TimetableModel({
    required super.id,
    required super.dayOfWeek,
    required super.startTime,
    required super.endTime,
    required super.subject,
    required super.teacherName,
    required super.room,
    required super.classId,
  });

  factory TimetableModel.fromJson(Map<String, dynamic> json) {
    return TimetableModel(
      id: json['id']?.toString() ?? '',
      dayOfWeek: json['day_of_week'] ?? json['day'] ?? 'Monday',
      startTime: json['start_time'] ?? '08:00 AM',
      endTime: json['end_time'] ?? '09:00 AM',
      subject: json['subject_name'] ?? json['subject'] ?? 'General',
      teacherName: json['teacher_name'] ?? 'Instructor',
      room: json['room'] ?? json['room_number'] ?? 'Classroom 1',
      classId: json['class_id']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'day_of_week': dayOfWeek,
      'start_time': startTime,
      'end_time': endTime,
      'subject': subject,
      'teacher_name': teacherName,
      'room': room,
      'class_id': classId,
    };
  }
}
