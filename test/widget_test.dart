import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:attendance_flutter_app/main.dart';
import 'package:attendance_flutter_app/providers/auth_provider.dart';
import 'package:attendance_flutter_app/providers/attendance_provider.dart';

void main() {
  testWidgets('AttendXApp smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider()),
          ChangeNotifierProvider(create: (_) => AttendanceProvider()),
        ],
        child: const AttendXApp(),
      ),
    );

    // Verify AttendX brand name renders
    expect(find.text('AttendX'), findsWidgets);
  });
}
