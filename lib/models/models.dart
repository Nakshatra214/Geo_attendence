class UserModel {
  final String id;
  final String name;
  final String email;
  final String role;
  final String department;
  final String employeeId;
  final String phone;
  final bool isActive;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.department = '',
    this.employeeId = '',
    this.phone = '',
    this.isActive = true,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id:         json['_id']        ?? '',
      name:       json['name']       ?? '',
      email:      json['email']      ?? '',
      role:       json['role']       ?? 'user',
      department: json['department'] ?? '',
      employeeId: json['employeeId'] ?? '',
      phone:      json['phone']      ?? '',
      isActive:   json['isActive']   ?? true,
    );
  }

  Map<String, dynamic> toJson() => {
    '_id': id, 'name': name, 'email': email, 'role': role,
    'department': department, 'employeeId': employeeId,
    'phone': phone, 'isActive': isActive,
  };
}

class AttendanceModel {
  final String id;
  final String date;
  final String? checkInTime;
  final String? checkOutTime;
  final String status;
  final double? workingHours;
  final String? locationName;
  final int? distanceAtCheckIn;

  AttendanceModel({
    required this.id,
    required this.date,
    this.checkInTime,
    this.checkOutTime,
    required this.status,
    this.workingHours,
    this.locationName,
    this.distanceAtCheckIn,
  });

  factory AttendanceModel.fromJson(Map<String, dynamic> json) {
    return AttendanceModel(
      id:                 json['_id']               ?? '',
      date:               json['date']              ?? '',
      checkInTime:        json['checkInTime'],
      checkOutTime:       json['checkOutTime'],
      status:             json['status']            ?? 'present',
      workingHours:       (json['workingHours'] as num?)?.toDouble(),
      locationName:       json['locationId']?['locationName'],
      distanceAtCheckIn:  json['distanceAtCheckIn'] as int?,
    );
  }
}

class LocationModel {
  final String id;
  final String locationName;
  final double latitude;
  final double longitude;
  final double radius;

  LocationModel({
    required this.id,
    required this.locationName,
    required this.latitude,
    required this.longitude,
    required this.radius,
  });

  factory LocationModel.fromJson(Map<String, dynamic> json) {
    return LocationModel(
      id:           json['_id']          ?? '',
      locationName: json['locationName'] ?? '',
      latitude:     (json['latitude']    as num).toDouble(),
      longitude:    (json['longitude']   as num).toDouble(),
      radius:       (json['radius']      as num).toDouble(),
    );
  }
}
