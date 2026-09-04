import '../../domain/entities/clinic_visit_entity.dart';

class ClinicVisitModel extends ClinicVisitEntity {
  const ClinicVisitModel({
    required super.id,
    required super.studentId,
    required super.studentName,
    required super.triageLevel,
    required super.symptoms,
    required super.diagnosis,
    required super.treatmentGiven,
    super.temperature,
    super.bloodPressure,
    super.heartRate,
    required super.checkInTime,
    super.checkOutTime,
    required super.attendingNurse,
    super.parentNotified = false,
  });

  factory ClinicVisitModel.fromJson(Map<String, dynamic> json) {
    return ClinicVisitModel(
      id: json['id'] ?? '',
      studentId: json['student_id'] ?? '',
      studentName: json['student_name'] ?? 'Student',
      triageLevel: json['triage_level'] ?? 'ROUTINE',
      symptoms: json['symptoms'] ?? '',
      diagnosis: json['diagnosis'] ?? '',
      treatmentGiven: json['treatment_given'] ?? '',
      temperature: json['temperature'] != null ? (json['temperature'] as num).toDouble() : null,
      bloodPressure: json['blood_pressure'],
      heartRate: json['heart_rate'] != null ? (json['heart_rate'] as num).toInt() : null,
      checkInTime: json['check_in_time'] != null
          ? DateTime.tryParse(json['check_in_time']) ?? DateTime.now()
          : DateTime.now(),
      checkOutTime: json['check_out_time'] != null
          ? DateTime.tryParse(json['check_out_time'])
          : null,
      attendingNurse: json['attending_nurse'] ?? 'Staff Nurse',
      parentNotified: json['parent_notified'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'student_id': studentId,
      'student_name': studentName,
      'triage_level': triageLevel,
      'symptoms': symptoms,
      'diagnosis': diagnosis,
      'treatment_given': treatmentGiven,
      'temperature': temperature,
      'blood_pressure': bloodPressure,
      'heart_rate': heartRate,
      'check_in_time': checkInTime.toIso8601String(),
      'check_out_time': checkOutTime?.toIso8601String(),
      'attending_nurse': attendingNurse,
      'parent_notified': parentNotified,
    };
  }
}

class HostelRoomModel extends HostelRoomEntity {
  const HostelRoomModel({
    required super.id,
    required super.hostelName,
    required super.roomNumber,
    required super.capacity,
    required super.occupiedBeds,
    required super.gender,
    required super.status,
  });

  factory HostelRoomModel.fromJson(Map<String, dynamic> json) {
    return HostelRoomModel(
      id: json['id'] ?? '',
      hostelName: json['hostel_name'] ?? 'Main Hall',
      roomNumber: json['room_number'] ?? '',
      capacity: (json['capacity'] ?? 4) as int,
      occupiedBeds: (json['occupied_beds'] ?? 0) as int,
      gender: json['gender'] ?? 'MALE',
      status: json['status'] ?? 'ACTIVE',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'hostel_name': hostelName,
      'room_number': roomNumber,
      'capacity': capacity,
      'occupied_beds': occupiedBeds,
      'gender': gender,
      'status': status,
    };
  }
}
