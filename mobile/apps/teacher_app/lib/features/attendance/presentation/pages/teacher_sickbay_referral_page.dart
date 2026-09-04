import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/teacher_drawer.dart';

class TeacherSickbayReferralPage extends StatefulWidget {
  const TeacherSickbayReferralPage({super.key});

  @override
  State<TeacherSickbayReferralPage> createState() => _TeacherSickbayReferralPageState();
}

class _TeacherSickbayReferralPageState extends State<TeacherSickbayReferralPage> {
  final _studentController = TextEditingController();
  final _symptomsController = TextEditingController();
  String _selectedSeverity = 'MEDIUM';

  @override
  void dispose() {
    _studentController.dispose();
    _symptomsController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const TeacherDrawer(currentRoute: '/sickbay-referral'),
      appBar: AppBar(
        title: Text(
          'Sickbay & Health Referral',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: isDark ? Colors.white : const Color(0xFF0F172A),
          ),
        ),
        backgroundColor: isDark ? const Color(0xFF0D1526) : Colors.white,
        elevation: 0,
      ),
      body: ListView(
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
                    color: const Color(0xFFEF4444).withAlpha(isDark ? 50 : 30),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(LucideIcons.stethoscope, size: 28, color: Color(0xFFEF4444)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Direct Clinic Triage Dispatch',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: isDark ? Colors.white : const Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Notifies duty medical officer and dispatches SMS alert to guardian.',
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

          SlCard(
            padding: const EdgeInsets.all(16),
            borderRadius: BorderRadius.circular(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: _studentController,
                  style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 13),
                  decoration: InputDecoration(
                    labelText: 'Student Name / Index Number',
                    labelStyle: TextStyle(color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                    prefixIcon: const Icon(LucideIcons.user, size: 18),
                    filled: true,
                    fillColor: isDark ? Colors.white.withAlpha(10) : const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _selectedSeverity,
                  style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 13),
                  dropdownColor: isDark ? const Color(0xFF0D1526) : Colors.white,
                  decoration: InputDecoration(
                    labelText: 'Triage Urgency Level',
                    labelStyle: TextStyle(color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                    prefixIcon: const Icon(LucideIcons.alertTriangle, size: 18),
                    filled: true,
                    fillColor: isDark ? Colors.white.withAlpha(10) : const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'LOW', child: Text('Low (Mild headache / Fatigue)')),
                    DropdownMenuItem(value: 'MEDIUM', child: Text('Medium (Fever, Nausea, Sprain)')),
                    DropdownMenuItem(value: 'HIGH', child: Text('High / Urgent (Asthma, Trauma, Fainting)')),
                  ],
                  onChanged: (v) => setState(() => _selectedSeverity = v ?? 'MEDIUM'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _symptomsController,
                  maxLines: 3,
                  style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 13),
                  decoration: InputDecoration(
                    labelText: 'Observed Symptoms & Classroom Notes',
                    labelStyle: TextStyle(color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                    filled: true,
                    fillColor: isDark ? Colors.white.withAlpha(10) : const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFEF4444),
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 44),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(LucideIcons.send, size: 18),
                  label: const Text('Dispatch Referral to Clinic Nurse', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Sickbay referral sent! Nurse notified.')),
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
