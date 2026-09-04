import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../common_widgets/sl_card.dart';
import '../common_widgets/sl_badge.dart';

class RolesPermissionsPage extends StatefulWidget {
  final Widget? drawer;
  const RolesPermissionsPage({super.key, this.drawer});

  @override
  State<RolesPermissionsPage> createState() => _RolesPermissionsPageState();
}

class _RolesPermissionsPageState extends State<RolesPermissionsPage> {
  final List<Map<String, dynamic>> _roles = [
    {
      'role': 'Super Administrator',
      'users': 2,
      'color': const Color(0xFFEF4444),
      'badge': 'ALL PRIVILEGES',
      'permissions': ['Tenant Management', 'Audit Trail Viewing', 'Financial Approvals', 'Academic Setup', 'Staff HR'],
    },
    {
      'role': 'Principal / Headmaster',
      'users': 3,
      'color': const Color(0xFF8B5CF6),
      'badge': 'EXECUTIVE',
      'permissions': ['Broadcasting', 'Student Admissions', 'Staff Overview', 'Report Approval'],
    },
    {
      'role': 'Faculty / Teacher',
      'users': 48,
      'color': const Color(0xFF10B981),
      'badge': 'ACADEMIC',
      'permissions': ['Roll Call / Attendance', 'Gradebook Entry', 'Homework Creation', 'Conduct Notes'],
    },
    {
      'role': 'School Bursar & Cashier',
      'users': 4,
      'color': const Color(0xFFF59E0B),
      'badge': 'FINANCE',
      'permissions': ['POS Payment Acceptance', 'Arrears Reporting', 'Bill Issuance', 'Daily Collections'],
    },
    {
      'role': 'Campus Clinic Nurse',
      'users': 2,
      'color': const Color(0xFFEC4899),
      'badge': 'HEALTH',
      'permissions': ['Sickbay Intake', 'Prescription Logs', 'Triage Alerts'],
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: widget.drawer,
      appBar: AppBar(
        title: Text(
          'Role-Based Permissions (RBAC)',
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
                    color: const Color(0xFF6366F1).withAlpha(isDark ? 50 : 30),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(LucideIcons.shieldCheck, size: 28, color: Color(0xFF6366F1)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Granular Access Governance',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: isDark ? Colors.white : const Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Control fine-grained UI modules and API endpoints per institutional role.',
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
            'CONFIGURED SYSTEM ROLES',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.1,
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 12),

          ..._roles.map((role) {
            final color = role['color'] as Color;
            final permissions = role['permissions'] as List<String>;

            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: SlCard(
                padding: const EdgeInsets.all(16),
                borderRadius: BorderRadius.circular(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            color: color.withAlpha(isDark ? 50 : 30),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Center(child: Icon(LucideIcons.shield, size: 18, color: color)),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                role['role'],
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${role['users']} assigned users',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                        ),
                        SlBadge(text: role['badge'], variant: SlBadgeVariant.primary),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: permissions.map((p) {
                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: isDark ? Colors.white.withAlpha(10) : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: isDark ? Colors.white.withAlpha(15) : const Color(0xFFE2E8F0)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(LucideIcons.check, size: 12, color: Color(0xFF10B981)),
                              const SizedBox(width: 4),
                              Text(
                                p,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155),
                                ),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}
