import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/attendance_provider.dart';
import '../models/app_constants.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});
  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      if (auth.user != null) {
        context.read<AttendanceProvider>().loadHistory(auth.user!.id);
      }
    });
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'present':  return const Color(0xFF22C55E);
      case 'late':     return const Color(0xFFF59E0B);
      case 'half-day': return const Color(0xFFF59E0B);
      case 'absent':   return const Color(0xFFEF4444);
      default:         return const Color(0xFF4F8EF7);
    }
  }

  String _fmt(String? dt) {
    if (dt == null) return '—';
    final d = DateTime.tryParse(dt);
    if (d == null) return '—';
    return '${d.hour.toString().padLeft(2,'0')}:${d.minute.toString().padLeft(2,'0')}';
  }

  @override
  Widget build(BuildContext context) {
    final att = context.watch<AttendanceProvider>();
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Attendance History', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w700)),
            if (att.summary != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFF1A2236), Color(0xFF1A3050)]),
                  borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF2A3554)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _SummaryItem(label: 'Total Days', value: att.history.length.toString()),
                    _SummaryItem(label: 'Attendance', value: att.summary ?? '—', highlight: true),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 16),
            Expanded(
              child: att.loading
                  ? const Center(child: CircularProgressIndicator(color: Color(AppConstants.primaryColor)))
                  : att.history.isEmpty
                      ? const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                          Icon(Icons.history, color: Color(0xFF2A3554), size: 64),
                          SizedBox(height: 12),
                          Text('No attendance records yet', style: TextStyle(color: Color(0xFF64748B), fontSize: 15)),
                        ]))
                      : ListView.separated(
                          itemCount: att.history.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (_, i) {
                            final r = att.history[i];
                            return Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(color: const Color(0xFF1A2236), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF2A3554))),
                              child: Row(
                                children: [
                                  Container(
                                    width: 6, height: 50, decoration: BoxDecoration(color: _statusColor(r.status), borderRadius: BorderRadius.circular(3)),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(r.date, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                                        const SizedBox(height: 2),
                                        Text('${r.locationName ?? 'Unknown location'}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                                      ],
                                    ),
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(color: _statusColor(r.status).withOpacity(0.15), borderRadius: BorderRadius.circular(100)),
                                        child: Text(r.status, style: TextStyle(color: _statusColor(r.status), fontSize: 11, fontWeight: FontWeight.w600)),
                                      ),
                                      const SizedBox(height: 4),
                                      Text('${_fmt(r.checkInTime)} → ${_fmt(r.checkOutTime)}', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                                      if (r.workingHours != null)
                                        Text('${r.workingHours}h', style: const TextStyle(color: Color(0xFF4F8EF7), fontSize: 11, fontWeight: FontWeight.w600)),
                                    ],
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryItem extends StatelessWidget {
  final String label, value;
  final bool highlight;
  const _SummaryItem({ required this.label, required this.value, this.highlight = false });
  @override
  Widget build(BuildContext context) => Column(
    children: [
      Text(value, style: TextStyle(color: highlight ? const Color(0xFF4F8EF7) : Colors.white, fontSize: 22, fontWeight: FontWeight.w800)),
      Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
    ],
  );
}
