import 'package:equatable/equatable.dart';

class ChildEntity extends Equatable {
  final String id;
  final String firstName;
  final String lastName;
  final String className;
  final String enrollmentNum;
  final String attendancePercent;
  final double outstandingFees;
  final String? profilePhotoUrl;
  final String? busRouteName;
  final String busStatus; // 'ON_BUS', 'AT_SCHOOL', 'AT_HOME'

  const ChildEntity({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.className,
    required this.enrollmentNum,
    this.attendancePercent = '96.5%',
    this.outstandingFees = 0.0,
    this.profilePhotoUrl,
    this.busRouteName,
    this.busStatus = 'AT_SCHOOL',
  });

  String get fullName => '$firstName $lastName';

  @override
  List<Object?> get props => [
        id,
        firstName,
        lastName,
        className,
        enrollmentNum,
        attendancePercent,
        outstandingFees,
        profilePhotoUrl,
        busRouteName,
        busStatus,
      ];
}

class PickupPassEntity extends Equatable {
  final String childId;
  final String guardianName;
  final String childName;
  final String childClassName;
  final String code;
  final DateTime expiresAt;
  final String qrData;

  const PickupPassEntity({
    this.childId = '',
    required this.guardianName,
    required this.childName,
    required this.childClassName,
    required this.code,
    required this.expiresAt,
    required this.qrData,
  });

  @override
  List<Object?> get props => [childId, guardianName, childName, childClassName, code, expiresAt, qrData];
}
