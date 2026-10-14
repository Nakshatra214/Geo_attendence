// ─── App Constants ────────────────────────────────────────────────────────────
class AppConstants {
  // Configurable API base URL: defaults to Next.js on localhost:3000/api
  // Can be overridden via: flutter run --dart-define=API_BASE_URL=https://your-domain.vercel.app/api
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000/api',
  );

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
