import 'package:equatable/equatable.dart';

class SchoolHouseEntity extends Equatable {
  final String id;
  final String name;
  final String colorHex;
  final String houseMaster;
  final int totalPoints;
  final int rank;
  final String motto;

  const SchoolHouseEntity({
    required this.id,
    required this.name,
    required this.colorHex,
    required this.houseMaster,
    required this.totalPoints,
    required this.rank,
    required this.motto,
  });

  @override
  List<Object?> get props => [
        id,
        name,
        colorHex,
        houseMaster,
        totalPoints,
        rank,
        motto,
      ];
}

class StudentMeritRecordEntity extends Equatable {
  final String id;
  final String studentId;
  final String studentName;
  final String houseId;
  final String houseName;
  final int points; // positive = merit, negative = demerit
  final String reason;
  final String category; // ACADEMICS, SPORTS, CONDUCT, LEADERSHIP
  final String awardedBy;
  final DateTime awardedAt;

  const StudentMeritRecordEntity({
    required this.id,
    required this.studentId,
    required this.studentName,
    required this.houseId,
    required this.houseName,
    required this.points,
    required this.reason,
    required this.category,
    required this.awardedBy,
    required this.awardedAt,
  });

  bool get isMerit => points > 0;

  @override
  List<Object?> get props => [
        id,
        studentId,
        studentName,
        houseId,
        houseName,
        points,
        reason,
        category,
        awardedBy,
        awardedAt,
      ];
}
