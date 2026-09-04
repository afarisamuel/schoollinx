import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../common_widgets/sl_card.dart';

class SystemAuditLogsPage extends StatefulWidget {
  final Widget? drawer;
  const SystemAuditLogsPage({super.key, this.drawer});

  @override
  State<SystemAuditLogsPage> createState() => _SystemAuditLogsPageState();
}

class _SystemAuditLogsPageState extends State<SystemAuditLogsPage> {
  final List<Map<String, dynamic>> _logs = [
    {
      'action': 'FEE_PAYMENT_PROCESSED',
      'user': 'Kofi Mensah (Bursar)',
      'ip': '192.168.1.45',
      'details': 'Received GH₵ 1,250.00 cash from Ama Serwaa (ADM-2024-0012)',
      'timestamp': 'Just now',
      'severity': 'INFO',
      'icon': LucideIcons.receipt,
      'color': const Color(0xFF10B981),
    },
    {
      'action': 'GRADE_BATCH_PUBLISHED',
      'user': 'Sarah Mensah (Teacher)',
      'ip': '10.0.4.12',
      'details': 'Published Midterm Scores for JHS 2 Integrated Science (42 pupils)',
      'timestamp': '14 mins ago',
      'severity': 'INFO',
      'icon': LucideIcons.checkCircle2,
      'color': const Color(0xFF3B82F6),
    },
    {
      'action': 'STUDENT_ENROLLED',
      'user': 'Administrator',
      'ip': '192.168.1.10',
      'details': 'Enrolled new student Emmanuel Appiah into Primary 4B',
      'timestamp': '1 hour ago',
      'severity': 'INFO',
      'icon': LucideIcons.userPlus,
      'color': const Color(0xFF8B5CF6),
    },
    {
      'action': 'SECURITY_AUTH_FAILED',
      'user': 'Unknown (portal_login)',
      'ip': '154.160.22.8',
      'details': 'Failed login attempt for username "admin_root" (3 invalid tries)',
      'timestamp': '3 hours ago',
      'severity': 'WARNING',
      'icon': LucideIcons.shieldAlert,
      'color': const Color(0xFFEF4444),
    },
    {
      'action': 'SMS_BROADCAST_DISPATCHED',
      'user': 'Administrator',
      'ip': '192.168.1.10',
      'details': 'Sent PTA Meeting Alert SMS to 380 Parent phone numbers via Hubtel',
      'timestamp': 'Yesterday',
      'severity': 'INFO',
      'icon': LucideIcons.send,
      'color': const Color(0xFFF59E0B),
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
          'System Audit Trail',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: isDark ? Colors.white : const Color(0xFF0F172A),
          ),
        ),
        backgroundColor: isDark ? const Color(0xFF0D1526) : Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(LucideIcons.download, size: 20, color: isDark ? Colors.white : const Color(0xFF0F172A)),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Exporting audit logs as CSV/PDF...')),
              );
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Security Integrity Strip
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
                  child: const Icon(LucideIcons.shieldCheck, size: 28, color: Color(0xFF10B981)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Immutable Cryptographic Trail',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: isDark ? Colors.white : const Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'All administrative mutations are hashed and preserved for auditing.',
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
            'RECORDED AUDIT ACTIVITY',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.1,
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 12),

          ..._logs.map((log) {
            final color = log['color'] as Color;

            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: SlCard(
                padding: const EdgeInsets.all(14),
                borderRadius: BorderRadius.circular(16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: color.withAlpha(isDark ? 50 : 30),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Center(child: Icon(log['icon'] as IconData, size: 18, color: color)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  log['action'],
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 0.5,
                                    color: color,
                                  ),
                                ),
                              ),
                              Text(
                                log['timestamp'],
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            log['details'],
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Icon(LucideIcons.user, size: 12, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                              const SizedBox(width: 4),
                              Text(
                                log['user'],
                                style: TextStyle(fontSize: 11, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B), fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(width: 12),
                              Icon(LucideIcons.globe, size: 12, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                              const SizedBox(width: 4),
                              Text(
                                log['ip'],
                                style: TextStyle(fontSize: 11, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B), fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                        ],
                      ),
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
