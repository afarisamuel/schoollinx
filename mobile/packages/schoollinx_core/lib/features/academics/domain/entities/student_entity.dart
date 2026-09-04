import 'package:equatable/equatable.dart';

class StudentEntity extends Equatable {
  final String id;
  final String firstName;
  final String lastName;
  final String? otherName;
  final String? enrollmentNum;
  final String? classId;
  final String? className;
  final String? status;
  final String? gender;
  final String? phone;

  const StudentEntity({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.otherName,
    this.enrollmentNum,
    this.classId,
    this.className,
    this.status = 'ACTIVE',
    this.gender,
    this.phone,
  });

  String get fullName => '$firstName $lastName'.trim();
  String get initials {
    final first = firstName.isNotEmpty ? firstName[0].toUpperCase() : '';
    final last = lastName.isNotEmpty ? lastName[0].toUpperCase() : '';
    return (first + last).isNotEmpty ? '$first$last' : 'S';
  }

  @override
  List<Object?> get props => [id, firstName, lastName, enrollmentNum, classId, status];
}
