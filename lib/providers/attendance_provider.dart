import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class AttendanceProvider with ChangeNotifier {
  AttendanceModel?   _todayRecord;
  List<AttendanceModel> _history  = [];
  List<LocationModel>   _locations = [];
  Position?          _currentPosition;
  bool _loading     = false;
  String? _error;
  String? _summary;

  AttendanceModel?      get todayRecord     => _todayRecord;
  List<AttendanceModel> get history         => _history;
  List<LocationModel>   get locations       => _locations;
  Position?             get currentPosition => _currentPosition;
  bool                  get loading         => _loading;
  String?               get error           => _error;
  String?               get summary         => _summary;
  bool                  get checkedIn       => _todayRecord?.checkInTime != null;
  bool                  get checkedOut      => _todayRecord?.checkOutTime != null;

  // ─── Request Location Permission & Get Position ───────────────────────────
  Future<String?> requestLocationAndFetch() async {
    LocationPermission perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.denied) return 'Location permission denied.';
    }
    if (perm == LocationPermission.deniedForever) return 'Location permission permanently denied. Enable in Settings.';

    try {
      _currentPosition = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      notifyListeners();
      return null;
    } catch (e) {
      return 'Failed to get location: $e';
    }
  }

  // ─── Load Today's Status ──────────────────────────────────────────────────
  Future<void> loadTodayStatus() async {
    _loading = true;
    notifyListeners();
    try {
      final res = await ApiService.getTodayStatus();
      if (res['success'] == true && res['data']['attendance'] != null) {
        _todayRecord = AttendanceModel.fromJson(res['data']['attendance']);
      } else {
        _todayRecord = null;
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  // ─── Load Locations ───────────────────────────────────────────────────────
  Future<void> loadLocations() async {
    try {
      final res = await ApiService.getLocations();
      if (res['success'] == true) {
        _locations = (res['data']['locations'] as List)
            .map((l) => LocationModel.fromJson(l))
            .toList();
        notifyListeners();
      }
    } catch (e) {
      _error = e.toString();
    }
  }

  // ─── Check-In ─────────────────────────────────────────────────────────────
  Future<String?> checkIn(String locationId) async {
    if (_currentPosition == null) return 'Please fetch your location first.';
    _loading = true;
    _error   = null;
    notifyListeners();
    try {
      final res = await ApiService.checkIn(
        latitude:   _currentPosition!.latitude,
        longitude:  _currentPosition!.longitude,
        locationId: locationId,
      );
      if (res['success'] == true) {
        _todayRecord = AttendanceModel.fromJson(res['data']['attendance']);
        notifyListeners();
        return null; // success
      } else {
        return res['message'] ?? 'Check-in failed';
      }
    } catch (e) {
      return 'Network error: $e';
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  // ─── Check-Out ────────────────────────────────────────────────────────────
  Future<String?> checkOut() async {
    _loading = true;
    _error   = null;
    notifyListeners();
    try {
      final res = await ApiService.checkOut(
        latitude:  _currentPosition?.latitude  ?? 0,
        longitude: _currentPosition?.longitude ?? 0,
      );
      if (res['success'] == true) {
        _todayRecord = AttendanceModel.fromJson(res['data']['attendance']);
        notifyListeners();
        return null;
      } else {
        return res['message'] ?? 'Check-out failed';
      }
    } catch (e) {
      return 'Network error: $e';
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  // ─── Load History ─────────────────────────────────────────────────────────
  Future<void> loadHistory(String userId) async {
    _loading = true;
    notifyListeners();
    try {
      final res = await ApiService.getHistory(userId);
      if (res['success'] == true) {
        _history = (res['data']['records'] as List)
            .map((r) => AttendanceModel.fromJson(r))
            .toList();
        _summary = res['data']['summary']['attendancePercentage'];
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }
}
