import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/attendance_provider.dart';
import '../models/app_constants.dart';
import 'history_screen.dart';
import 'profile_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final att = context.read<AttendanceProvider>();
      att.loadTodayStatus();
      att.loadLocations();
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    return Scaffold(
      backgroundColor: const Color(AppConstants.bgColor),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _tab,
        onTap: (i) => setState(() => _tab = i),
        backgroundColor: const Color(0xFF111827),
        selectedItemColor: const Color(AppConstants.primaryColor),
        unselectedItemColor: const Color(0xFF64748B),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_outlined),   activeIcon: Icon(Icons.home),              label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.history_outlined), activeIcon: Icon(Icons.history),           label: 'History'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline),   activeIcon: Icon(Icons.person),            label: 'Profile'),
        ],
      ),
      body: IndexedStack(
        index: _tab,
        children: [
          _HomeTab(user: user),
          const HistoryScreen(),
          const ProfileScreen(),
        ],
      ),
    );
  }
}

class _HomeTab extends StatefulWidget {
  final dynamic user;
  const _HomeTab({this.user});
  @override
  State<_HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<_HomeTab> {
  String? _selectedLocationId;

  Future<void> _getLocation() async {
    final att = context.read<AttendanceProvider>();
    final err = await att.requestLocationAndFetch();
    if (err != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err), backgroundColor: const Color(AppConstants.dangerColor)));
    }
  }

  Future<void> _checkIn() async {
    if (_selectedLocationId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a location first')));
      return;
    }
    final att = context.read<AttendanceProvider>();
    if (att.currentPosition == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Get your location first')));
      return;
    }
    final err = await att.checkIn(_selectedLocationId!);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(err ?? '✅ Checked in successfully!'),
        backgroundColor: err == null ? const Color(AppConstants.successColor) : const Color(AppConstants.dangerColor),
      ));
    }
  }

  Future<void> _checkOut() async {
    final att = context.read<AttendanceProvider>();
    final err = await att.checkOut();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(err ?? '🏁 Checked out successfully!'),
        backgroundColor: err == null ? const Color(AppConstants.successColor) : const Color(AppConstants.dangerColor),
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final att  = context.watch<AttendanceProvider>();
    final date = DateTime.now();
    final dateStr = '${date.day}/${date.month}/${date.year}';

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Hello, ${widget.user?.name?.split(' ').first ?? 'User'}! 👋', style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    Text(dateStr, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: const Color(0xFF1A2236), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF2A3554))),
                  child: const Icon(Icons.location_on, color: Color(AppConstants.primaryColor), size: 22),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Status Card
            _StatusCard(record: att.todayRecord, checkedIn: att.checkedIn, checkedOut: att.checkedOut),
            const SizedBox(height: 20),

            // GPS Card
            _GpsCard(position: att.currentPosition, onGetLocation: _getLocation, loading: att.loading),
            const SizedBox(height: 20),

            // Location Selector
            if (!att.checkedIn && att.locations.isNotEmpty) ...[
              const Text('Select Location', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                decoration: BoxDecoration(color: const Color(0xFF1A2236), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFF2A3554))),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedLocationId,
                    dropdownColor: const Color(0xFF1A2236),
                    style: const TextStyle(color: Colors.white, fontSize: 14),
                    hint: const Text('Choose authorized location', style: TextStyle(color: Color(0xFF64748B))),
                    isExpanded: true,
                    items: att.locations.map((l) => DropdownMenuItem(value: l.id, child: Text(l.locationName))).toList(),
                    onChanged: (v) => setState(() => _selectedLocationId = v),
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Action Buttons
            if (!att.checkedIn)
              SizedBox(
                width: double.infinity,
                height: 54,
                child: ElevatedButton.icon(
                  onPressed: att.loading ? null : _checkIn,
                  icon: const Icon(Icons.login, color: Colors.white),
                  label: att.loading ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2) : const Text('CHECK IN', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Colors.white)),
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(AppConstants.successColor), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                ),
              )
            else if (!att.checkedOut)
              SizedBox(
                width: double.infinity,
                height: 54,
                child: ElevatedButton.icon(
                  onPressed: att.loading ? null : _checkOut,
                  icon: const Icon(Icons.logout, color: Colors.white),
                  label: att.loading ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2) : const Text('CHECK OUT', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Colors.white)),
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(AppConstants.primaryColor), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                ),
              )
            else
              Container(
                width: double.infinity, padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: const Color(0xFF1A2236), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF22C55E))),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.check_circle, color: Color(0xFF22C55E)),
                    SizedBox(width: 8),
                    Text('Attendance Completed for Today! 🎉', style: TextStyle(color: Color(0xFF22C55E), fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _StatusCard extends StatelessWidget {
  final dynamic record;
  final bool checkedIn;
  final bool checkedOut;
  const _StatusCard({ this.record, required this.checkedIn, required this.checkedOut });

  @override
  Widget build(BuildContext context) {
    Color statusColor = checkedOut ? const Color(0xFF22C55E) : checkedIn ? const Color(0xFF4F8EF7) : const Color(0xFF64748B);
    String statusText = checkedOut ? 'Completed' : checkedIn ? 'Checked In' : 'Not Checked In';
    IconData icon     = checkedOut ? Icons.check_circle : checkedIn ? Icons.radio_button_checked : Icons.radio_button_unchecked;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [const Color(0xFF1A2236), Color(statusColor.value).withOpacity(0.15)], begin: Alignment.topLeft, end: Alignment.bottomRight),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: statusColor.withOpacity(0.4)),
      ),
      child: Row(
        children: [
          Icon(icon, color: statusColor, size: 32),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("Today's Status", style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                Text(statusText, style: TextStyle(color: statusColor, fontWeight: FontWeight.w700, fontSize: 18)),
                if (record?.checkInTime != null)
                  Text('In: ${_formatTime(record.checkInTime)}${record.checkOutTime != null ? '  •  Out: ${_formatTime(record.checkOutTime)}' : ''}',
                    style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
              ],
            ),
          ),
          if (record?.workingHours != null)
            Column(
              children: [
                Text('${record.workingHours}h', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 20)),
                const Text('worked', style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
              ],
            ),
        ],
      ),
    );
  }

  String _formatTime(String? dt) {
    if (dt == null) return '';
    final d = DateTime.tryParse(dt);
    if (d == null) return '';
    return '${d.hour.toString().padLeft(2,'0')}:${d.minute.toString().padLeft(2,'0')}';
  }
}

class _GpsCard extends StatelessWidget {
  final dynamic position;
  final VoidCallback onGetLocation;
  final bool loading;
  const _GpsCard({ this.position, required this.onGetLocation, required this.loading });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: const Color(0xFF1A2236), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF2A3554))),
      child: Column(
        children: [
          Row(
            children: [
              const Icon(Icons.my_location, color: Color(AppConstants.primaryColor), size: 18),
              const SizedBox(width: 8),
              const Text('GPS Location', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
              const Spacer(),
              TextButton(
                onPressed: loading ? null : onGetLocation,
                child: const Text('Refresh', style: TextStyle(color: Color(AppConstants.primaryColor), fontSize: 13)),
              ),
            ],
          ),
          if (position != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(child: _CoordBox(label: 'LAT', value: position.latitude.toStringAsFixed(6))),
                const SizedBox(width: 8),
                Expanded(child: _CoordBox(label: 'LNG', value: position.longitude.toStringAsFixed(6))),
              ],
            ),
            const SizedBox(height: 6),
            Text('Accuracy: ±${position.accuracy.toStringAsFixed(0)}m', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
          ] else
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text('Tap "Refresh" to get your current location', style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
            ),
        ],
      ),
    );
  }
}

class _CoordBox extends StatelessWidget {
  final String label, value;
  const _CoordBox({ required this.label, required this.value });
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
    decoration: BoxDecoration(color: const Color(0xFF111827), borderRadius: BorderRadius.circular(8)),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 10, fontWeight: FontWeight.w600)),
        Text(value, style: const TextStyle(color: Colors.white, fontSize: 12, fontFamily: 'monospace')),
      ],
    ),
  );
}
