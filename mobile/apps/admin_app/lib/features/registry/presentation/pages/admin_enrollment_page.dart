import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/admin_drawer.dart';

class AdminEnrollmentPage extends StatefulWidget {
  const AdminEnrollmentPage({super.key});

  @override
  State<AdminEnrollmentPage> createState() => _AdminEnrollmentPageState();
}

class _AdminEnrollmentPageState extends State<AdminEnrollmentPage> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _guardianPhoneController = TextEditingController();
  String _selectedClass = 'Primary 1A';

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _guardianPhoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const AdminDrawer(currentRoute: '/enrollment'),
      appBar: AppBar(
        title: Text(
          'Student Admissions & Enrollment',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: isDark ? Colors.white : const Color(0xFF0F172A),
          ),
        ),
        backgroundColor: isDark ? const Color(0xFF0D1526) : Colors.white,
        elevation: 0,
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            SlCard(
              padding: const EdgeInsets.all(16),
              borderRadius: BorderRadius.circular(16),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withAlpha(isDark ? 50 : 30),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(LucideIcons.userPlus, size: 28, color: Color(0xFF10B981)),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Direct Enrollment Portal',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w900,
                            color: isDark ? Colors.white : const Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          'Generates student index number, admission docket, and parent portal PIN.',
                          style: TextStyle(
                            fontSize: 11.5,
                            color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            Text(
              'PUPIL BIOGRAPHICAL DATA',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.1,
                color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
              ),
            ),
            const SizedBox(height: 12),

            SlCard(
              padding: const EdgeInsets.all(16),
              borderRadius: BorderRadius.circular(16),
              child: Column(
                children: [
                  TextFormField(
                    controller: _firstNameController,
                    style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 13),
                    decoration: InputDecoration(
                      labelText: 'First Name',
                      labelStyle: TextStyle(color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                      prefixIcon: const Icon(LucideIcons.user, size: 18),
                      filled: true,
                      fillColor: isDark ? Colors.white.withAlpha(10) : const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _lastNameController,
                    style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 13),
                    decoration: InputDecoration(
                      labelText: 'Surname / Last Name',
                      labelStyle: TextStyle(color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                      prefixIcon: const Icon(LucideIcons.userCheck, size: 18),
                      filled: true,
                      fillColor: isDark ? Colors.white.withAlpha(10) : const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: _selectedClass,
                    style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 13),
                    dropdownColor: isDark ? const Color(0xFF0D1526) : Colors.white,
                    decoration: InputDecoration(
                      labelText: 'Enrolling Class Stream',
                      labelStyle: TextStyle(color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                      prefixIcon: const Icon(LucideIcons.school, size: 18),
                      filled: true,
                      fillColor: isDark ? Colors.white.withAlpha(10) : const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                    items: ['Primary 1A', 'Primary 2B', 'JHS 1A', 'JHS 2 Science', 'SHS 1 General Arts']
                        .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                        .toList(),
                    onChanged: (v) => setState(() => _selectedClass = v ?? _selectedClass),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            Text(
              'PRIMARY GUARDIAN & EMERGENCY CONTACT',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.1,
                color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
              ),
            ),
            const SizedBox(height: 12),

            SlCard(
              padding: const EdgeInsets.all(16),
              borderRadius: BorderRadius.circular(16),
              child: Column(
                children: [
                  TextFormField(
                    controller: _guardianPhoneController,
                    keyboardType: TextInputType.phone,
                    style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 13),
                    decoration: InputDecoration(
                      labelText: 'Guardian Phone Number (SMS / WhatsApp)',
                      labelStyle: TextStyle(color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                      prefixIcon: const Icon(LucideIcons.phone, size: 18),
                      filled: true,
                      fillColor: isDark ? Colors.white.withAlpha(10) : const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 0,
              ),
              icon: const Icon(LucideIcons.checkCircle2, size: 20),
              label: const Text(
                'Complete Admission & Generate ID Docket',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
              ),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Student successfully enrolled! Admission docket dispatched to guardian.'),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
