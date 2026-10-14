import 'package:flutter/foundation.dart';

// ─── App Constants ────────────────────────────────────────────────────────────
class AppConstants {
  static const String _envBaseUrl = String.fromEnvironment('API_BASE_URL');

  // Configurable API base URL:
  // On web, dynamically resolves relative to current host origin (/api)
  // On mobile (Android/iOS), defaults to http://localhost:3000/api unless overridden via --dart-define=API_BASE_URL=...
  static String get baseUrl {
    if (_envBaseUrl.isNotEmpty) return _envBaseUrl;
    if (kIsWeb) {
      final base = Uri.base.resolve('/api').toString();
      return base.endsWith('/') ? base.substring(0, base.length - 1) : base;
    }
    return 'http://localhost:3000/api';
  }

  static const String tokenKey   = 'auth_token';
  static const String userKey    = 'auth_user';
  static const String appName    = 'AttendX';

  // Colors
  static const int primaryColor  = 0xFF4F8EF7;
  static const int successColor  = 0xFF22C55E;
  static const int warningColor  = 0xFFF59E0B;
  static const int dangerColor   = 0xFFEF4444;
  static const int bgColor       = 0xFF0A0E1A;
  static const int cardColor     = 0xFF1A2236;
}
