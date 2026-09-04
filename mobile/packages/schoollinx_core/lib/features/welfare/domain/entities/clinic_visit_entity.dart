import 'package:equatable/equatable.dart';

class ClinicVisitEntity extends Equatable {
  final String id;
  final String studentId;
  final String studentName;
  final String triageLevel; // ROUTINE, URGENT, EMERGENCY
  final String symptoms;
  final String diagnosis;
  final String treatmentGiven;
  final double? temperature; // in Celsius
  final String? bloodPressure;
  final int? heartRate;
  final DateTime checkInTime;
  final DateTime? checkOutTime;
  final String attendingNurse;
  final bool parentNotified;

  const ClinicVisitEntity({
    required this.id,
    required this.studentId,
    required this.studentName,
    required this.triageLevel,
    required this.symptoms,
    required this.diagnosis,
    required this.treatmentGiven,
    this.temperature,
    this.bloodPressure,
    this.heartRate,
    required this.checkInTime,
    this.checkOutTime,
    required this.attendingNurse,
    this.parentNotified = false,
  });

  @override
  List<Object?> get props => [
        id,
        studentId,
        studentName,
        triageLevel,
        symptoms,
        diagnosis,
        treatmentGiven,
        temperature,
        bloodPressure,
        heartRate,
        checkInTime,
        checkOutTime,
        attendingNurse,
        parentNotified,
      ];
}

class HostelRoomEntity extends Equatable {
  final String id;
  final String hostelName;
  final String roomNumber;
  final int capacity;
  final int occupiedBeds;
  final String gender; // MALE, FEMALE
  final String status; // ACTIVE, MAINTENANCE

  const HostelRoomEntity({
    required this.id,
    required this.hostelName,
    required this.roomNumber,
    required this.capacity,
    required this.occupiedBeds,
    required this.gender,
    required this.status,
  });

  bool get isFull => occupiedBeds >= capacity;

  @override
  List<Object?> get props => [
        id,
        hostelName,
        roomNumber,
        capacity,
        occupiedBeds,
        gender,
        status,
      ];
}
