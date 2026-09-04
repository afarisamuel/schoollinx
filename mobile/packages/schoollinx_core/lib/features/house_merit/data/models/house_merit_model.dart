import '../../domain/entities/house_merit_entity.dart';

class SchoolHouseModel extends SchoolHouseEntity {
  const SchoolHouseModel({
    required super.id,
    required super.name,
    required super.colorHex,
    required super.houseMaster,
    required super.totalPoints,
    required super.rank,
    required super.motto,
  });

  factory SchoolHouseModel.fromJson(Map<String, dynamic> json) {
    return SchoolHouseModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      colorHex: json['color_hex'] ?? '#3B82F6',
      houseMaster: json['house_master'] ?? 'House Master',
      totalPoints: (json['total_points'] ?? 0) as int,
      rank: (json['rank'] ?? 1) as int,
      motto: json['motto'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'color_hex': colorHex,
      'house_master': houseMaster,
      'total_points': totalPoints,
      'rank': rank,
      'motto': motto,
    };
  }
}

class StudentMeritRecordModel extends StudentMeritRecordEntity {
  const StudentMeritRecordModel({
    required super.id,
    required super.studentId,
    required super.studentName,
    required super.houseId,
    required super.houseName,
    required super.points,
    required super.reason,
    required super.category,
    required super.awardedBy,
    required super.awardedAt,
  });

  factory StudentMeritRecordModel.fromJson(Map<String, dynamic> json) {
    return StudentMeritRecordModel(
      id: json['id'] ?? '',
      studentId: json['student_id'] ?? '',
      studentName: json['student_name'] ?? 'Student',
      houseId: json['house_id'] ?? '',
      houseName: json['house_name'] ?? 'House',
      points: (json['points'] ?? 0) as int,
      reason: json['reason'] ?? '',
      category: json['category'] ?? 'CONDUCT',
      awardedBy: json['awarded_by'] ?? 'Staff',
      awardedAt: json['awarded_at'] != null
          ? DateTime.tryParse(json['awarded_at']) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'student_id': studentId,
      'student_name': studentName,
      'house_id': houseId,
      'house_name': houseName,
      'points': points,
      'reason': reason,
      'category': category,
      'awarded_by': awardedBy,
      'awarded_at': awardedAt.toIso8601String(),
    };
  }
}
