import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';
import '../models/app_constants.dart';
import '../services/api_service.dart';

class AuthProvider with ChangeNotifier {
  UserModel? _user;
  String?    _token;
  bool       _loading = false;

  UserModel? get user    => _user;
  String?    get token   => _token;
  bool       get loading => _loading;
  bool       get isLoggedIn => _user != null && _token != null;

  // ─── Load from SharedPreferences ───────────────────────────────────────────
  Future<void> loadFromStorage() async {
    final prefs = await SharedPreferences.getInstance();
    final t     = prefs.getString(AppConstants.tokenKey);
    final u     = prefs.getString(AppConstants.userKey);
    if (t != null && u != null) {
      _token = t;
      _user  = UserModel.fromJson(jsonDecode(u));
      notifyListeners();
    }
  }

  // ─── Login ──────────────────────────────────────────────────────────────────
  Future<String?> login(String email, String password) async {
    _loading = true;
    notifyListeners();
    try {
      final res = await ApiService.login(email, password);
      if (res['success'] == true) {
        _token = res['data']['token'];
        _user  = UserModel.fromJson(res['data']['user']);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(AppConstants.tokenKey, _token!);
        await prefs.setString(AppConstants.userKey,  jsonEncode(res['data']['user']));
        notifyListeners();
        return null; // success
      } else {
        return res['message'] ?? 'Login failed';
      }
    } catch (e) {
      return 'Network error: $e';
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  // ─── Register ───────────────────────────────────────────────────────────────
  Future<String?> register({ required String name, required String email, required String password, String dept = '', String empId = '', String phone = '' }) async {
    _loading = true;
    notifyListeners();
    try {
      final res = await ApiService.register(name: name, email: email, password: password, department: dept, employeeId: empId, phone: phone);
      if (res['success'] == true) {
        _token = res['data']['token'];
        _user  = UserModel.fromJson(res['data']['user']);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(AppConstants.tokenKey, _token!);
        await prefs.setString(AppConstants.userKey,  jsonEncode(res['data']['user']));
        notifyListeners();
        return null;
      } else {
        return res['message'] ?? 'Registration failed';
      }
    } catch (e) {
      return 'Network error: $e';
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  // ─── Logout ─────────────────────────────────────────────────────────────────
  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AppConstants.tokenKey);
    await prefs.remove(AppConstants.userKey);
    _token = null;
    _user  = null;
    notifyListeners();
  }
}
