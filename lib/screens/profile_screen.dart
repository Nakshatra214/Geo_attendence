import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../models/app_constants.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final auth = context.read<AuthProvider>();
    final initials = user?.name.split(' ').map((n) => n.isNotEmpty ? n[0] : '').join().toUpperCase() ?? 'U';

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            const SizedBox(height: 12),
            // Avatar
            Container(
              width: 80, height: 80,
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFF4F8EF7), Color(0xFF7C5FFF)]),
                borderRadius: BorderRadius.circular(40),
              ),
              child: Center(child: Text(initials, style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800))),
            ),
            const SizedBox(height: 12),
            Text(user?.name ?? '', style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(user?.email ?? '', style: const TextStyle(color: Color(0xFF64748B), fontSize: 14)),
            const SizedBox(height: 24),

            // Info Card
            Container(
              decoration: BoxDecoration(color: const Color(0xFF1A2236), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFF2A3554))),
              child: Column(
                children: [
                  _InfoRow(icon: Icons.badge_outlined,      label: 'Employee ID', value: user?.employeeId.isEmpty == true ? 'Not set' : user?.employeeId ?? 'Not set'),
                  const Divider(color: Color(0xFF2A3554), height: 1),
                  _InfoRow(icon: Icons.business_outlined,   label: 'Department',  value: user?.department.isEmpty == true ? 'Not set' : user?.department ?? 'Not set'),
                  const Divider(color: Color(0xFF2A3554), height: 1),
                  _InfoRow(icon: Icons.phone_outlined,      label: 'Phone',       value: user?.phone.isEmpty == true ? 'Not set' : user?.phone ?? 'Not set'),
                  const Divider(color: Color(0xFF2A3554), height: 1),
                  _InfoRow(icon: Icons.shield_outlined,     label: 'Role',        value: user?.role.toUpperCase() ?? 'USER', valueColor: const Color(0xFF4F8EF7)),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Logout Button
            SizedBox(
              width: double.infinity,
              height: 50,
              child: OutlinedButton.icon(
                onPressed: () async {
                  final ok = await showDialog<bool>(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      backgroundColor: const Color(0xFF1A2236),
                      title: const Text('Logout', style: TextStyle(color: Colors.white)),
                      content: const Text('Are you sure you want to logout?', style: TextStyle(color: Color(0xFF94A3B8))),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B)))),
                        TextButton(onPressed: () => Navigator.pop(ctx, true),  child: const Text('Logout',  style: TextStyle(color: Color(0xFFEF4444)))),
                      ],
                    ),
                  );
                  if (ok == true) await auth.logout();
                },
                icon: const Icon(Icons.logout, color: Color(0xFFEF4444)),
                label: const Text('Logout', style: TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.w600, fontSize: 15)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFFEF4444)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label, value;
  final Color? valueColor;
  const _InfoRow({ required this.icon, required this.label, required this.value, this.valueColor });
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    child: Row(
      children: [
        Icon(icon, color: const Color(0xFF64748B), size: 18),
        const SizedBox(width: 12),
        Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14)),
        const Spacer(),
        Text(value, style: TextStyle(color: valueColor ?? Colors.white, fontWeight: FontWeight.w600, fontSize: 14)),
      ],
    ),
  );
}
