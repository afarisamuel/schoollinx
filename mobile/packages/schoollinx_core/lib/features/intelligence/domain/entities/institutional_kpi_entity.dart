import 'package:equatable/equatable.dart';

class InstitutionalKpiEntity extends Equatable {
  final int totalStudents;
  final int totalTeachers;
  final int totalGuardians;
  final double averageGpa;
  final double averageAttendance;
  final double totalRevenue;
  final int libraryLoans;
  final String activeAcademicYear;
  final String activeTerm;
  final int termCount;
  final int totalLevels;

  const InstitutionalKpiEntity({
    this.totalStudents = 0,
    this.totalTeachers = 0,
    this.totalGuardians = 0,
    this.averageGpa = 0.0,
    this.averageAttendance = 0.0,
    this.totalRevenue = 0.0,
    this.libraryLoans = 0,
    this.activeAcademicYear = '2026/2027',
    this.activeTerm = 'Term 1',
    this.termCount = 3,
    this.totalLevels = 0,
  });

  factory InstitutionalKpiEntity.fromJson(Map<String, dynamic> json) {
    return InstitutionalKpiEntity(
      totalStudents: (json['total_students'] as num?)?.toInt() ?? 0,
      totalTeachers: (json['total_teachers'] as num?)?.toInt() ?? 0,
      totalGuardians: (json['total_guardians'] as num?)?.toInt() ?? 0,
      averageGpa: (json['average_gpa'] as num?)?.toDouble() ?? 0.0,
      averageAttendance: (json['average_attendance'] as num?)?.toDouble() ?? 0.0,
      totalRevenue: (json['total_revenue'] as num?)?.toDouble() ?? 0.0,
      libraryLoans: (json['library_loans'] as num?)?.toInt() ?? 0,
      activeAcademicYear: json['active_academic_year']?.toString() ?? '2026/2027',
      activeTerm: json['active_term']?.toString() ?? 'Term 1',
      termCount: (json['term_count'] as num?)?.toInt() ?? 3,
      totalLevels: (json['total_levels'] as num?)?.toInt() ?? 0,
    );
  }

  @override
  List<Object?> get props => [
        totalStudents,
        totalTeachers,
        totalGuardians,
        averageGpa,
        averageAttendance,
        totalRevenue,
        libraryLoans,
        activeAcademicYear,
        activeTerm,
        termCount,
        totalLevels,
      ];
}
