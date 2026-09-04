import 'package:equatable/equatable.dart';

class AcademicClassEntity extends Equatable {
  final String id;
  final String name;
  final String? teacherId;
  final String? scholasticLevelId;
  final String? scholasticLevelName;
  final int studentsCount;

  const AcademicClassEntity({
    required this.id,
    required this.name,
    this.teacherId,
    this.scholasticLevelId,
    this.scholasticLevelName,
    this.studentsCount = 0,
  });

  @override
  List<Object?> get props => [id, name, teacherId, scholasticLevelId, studentsCount];
}
