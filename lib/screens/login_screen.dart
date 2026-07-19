import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../models/app_constants.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey    = GlobalKey<FormState>();
  final _emailCtrl  = TextEditingController();
  final _passCtrl   = TextEditingController();
  bool _obscure     = true;
  bool _isRegister  = false;
  final _nameCtrl   = TextEditingController();

  @override
  void dispose() {
    _emailCtrl.dispose(); _passCtrl.dispose(); _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final auth   = context.read<AuthProvider>();
    String? error;
    if (_isRegister) {
      error = await auth.register(name: _nameCtrl.text.trim(), email: _emailCtrl.text.trim(), password: _passCtrl.text);
    } else {
      error = await auth.login(_emailCtrl.text.trim(), _passCtrl.text);
    }
    if (error != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error), backgroundColor: const Color(AppConstants.dangerColor)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Scaffold(
      backgroundColor: const Color(AppConstants.bgColor),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const SizedBox(height: 48),
              // Logo
              Container(
                width: 72, height: 72,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFF4F8EF7), Color(0xFF7C5FFF)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Icon(Icons.location_on, color: Colors.white, size: 36),
              ),
              const SizedBox(height: 16),
              const Text('AttendX', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: Colors.white)),
              const SizedBox(height: 6),
              Text(
                _isRegister ? 'Create your account' : 'Sign in to mark attendance',
                style: const TextStyle(fontSize: 14, color: Color(0xFF94A3B8)),
              ),
              const SizedBox(height: 36),
              // Form Card
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: const Color(AppConstants.cardColor),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF2A3554)),
                ),
                child: Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      if (_isRegister) ...[
                        _buildField(controller: _nameCtrl, label: 'Full Name', icon: Icons.person_outline, validator: (v) => (v?.isEmpty ?? true) ? 'Required' : null),
                        const SizedBox(height: 16),
                      ],
                      _buildField(controller: _emailCtrl, label: 'Email', icon: Icons.email_outlined, keyboardType: TextInputType.emailAddress, validator: (v) => (v?.contains('@') ?? false) ? null : 'Valid email required'),
                      const SizedBox(height: 16),
                      _buildField(controller: _passCtrl, label: 'Password', icon: Icons.lock_outline, obscure: _obscure, suffixIcon: IconButton(icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility, color: const Color(0xFF64748B)), onPressed: () => setState(() => _obscure = !_obscure)), validator: (v) => (v?.length ?? 0) < 6 ? 'Min 6 characters' : null),
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: ElevatedButton(
                          onPressed: auth.loading ? null : _submit,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(AppConstants.primaryColor),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: auth.loading
                              ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                              : Text(_isRegister ? 'Create Account' : 'Sign In', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(_isRegister ? 'Already have an account? ' : "Don't have an account? ", style: const TextStyle(color: Color(0xFF64748B), fontSize: 14)),
                  GestureDetector(
                    onTap: () => setState(() { _isRegister = !_isRegister; }),
                    child: Text(_isRegister ? 'Sign In' : 'Register', style: const TextStyle(color: Color(AppConstants.primaryColor), fontWeight: FontWeight.w600, fontSize: 14)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildField({ required TextEditingController controller, required String label, required IconData icon, bool obscure = false, Widget? suffixIcon, TextInputType? keyboardType, String? Function(String?)? validator }) {
    return TextFormField(
      controller: controller,
      obscureText: obscure,
      keyboardType: keyboardType,
      validator: validator,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Color(0xFF64748B)),
        prefixIcon: Icon(icon, color: const Color(0xFF64748B), size: 20),
        suffixIcon: suffixIcon,
        filled: true,
        fillColor: const Color(0xFF111827),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF2A3554))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF2A3554))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(AppConstants.primaryColor), width: 2)),
        errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(AppConstants.dangerColor))),
        focusedErrorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(AppConstants.dangerColor))),
        errorStyle: const TextStyle(color: Color(AppConstants.dangerColor)),
      ),
    );
  }
}
