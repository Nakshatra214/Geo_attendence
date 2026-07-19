import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/app_constants.dart';

class ApiService {
  static String get _base => AppConstants.baseUrl;

  // ─── Get stored token ──────────────────────────────────────────────────────
  static Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(AppConstants.tokenKey);
  }

  // ─── Build headers ──────────────────────────────────────────────────────────
  static Future<Map<String, String>> _headers({bool auth = false}) async {
    final h = {'Content-Type': 'application/json'};
    if (auth) {
      final token = await _getToken();
      if (token != null) h['Authorization'] = 'Bearer $token';
    }
    return h;
  }

  // ─── Auth ───────────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> register({
    required String name,
    required String email,
    required String password,
    String department = '',
    String employeeId = '',
    String phone = '',
  }) async {
    final res = await http.post(
      Uri.parse('$_base/auth/register'),
      headers: await _headers(),
      body: jsonEncode({ 'name': name, 'email': email, 'password': password, 'department': department, 'employeeId': employeeId, 'phone': phone }),
    );
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await http.post(
      Uri.parse('$_base/auth/login'),
      headers: await _headers(),
      body: jsonEncode({ 'email': email, 'password': password }),
    );
    return jsonDecode(res.body);
  }

  // ─── Locations ──────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> getLocations() async {
    final res = await http.get(
      Uri.parse('$_base/admin/locations'),
      headers: await _headers(auth: true),
    );
    return jsonDecode(res.body);
  }

  // ─── Attendance ─────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> checkIn({
    required double latitude,
    required double longitude,
    required String locationId,
  }) async {
    final res = await http.post(
      Uri.parse('$_base/attendance/checkin'),
      headers: await _headers(auth: true),
      body: jsonEncode({ 'latitude': latitude, 'longitude': longitude, 'locationId': locationId }),
    );
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> checkOut({
    required double latitude,
    required double longitude,
  }) async {
    final res = await http.post(
      Uri.parse('$_base/attendance/checkout'),
      headers: await _headers(auth: true),
      body: jsonEncode({ 'latitude': latitude, 'longitude': longitude }),
    );
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> getTodayStatus() async {
    final res = await http.get(
      Uri.parse('$_base/attendance/today'),
      headers: await _headers(auth: true),
    );
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> getHistory(String userId, { int page = 1 }) async {
    final res = await http.get(
      Uri.parse('$_base/attendance/history/$userId?page=$page&limit=20'),
      headers: await _headers(auth: true),
    );
    return jsonDecode(res.body);
  }

  // ─── User Profile ───────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> getProfile() async {
    final res = await http.get(
      Uri.parse('$_base/user/profile'),
      headers: await _headers(auth: true),
    );
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> data) async {
    final res = await http.put(
      Uri.parse('$_base/user/profile'),
      headers: await _headers(auth: true),
      body: jsonEncode(data),
    );
    return jsonDecode(res.body);
  }
}
