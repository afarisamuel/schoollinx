import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/admin_drawer.dart';

class AdminSuperControlsPage extends StatefulWidget {
  const AdminSuperControlsPage({super.key});

  @override
  State<AdminSuperControlsPage> createState() => _AdminSuperControlsPageState();
}

class _AdminSuperControlsPageState extends State<AdminSuperControlsPage> {
  bool _maintenanceMode = false;
  bool _smsGatewayActive = true;
  bool _biometricAutoSync = true;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const AdminDrawer(currentRoute: '/super-admin'),
      appBar: AppBar(
        title: Text(
          'Super Administrator Controls',
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
                    color: const Color(0xFFF59E0B).withAlpha(isDark ? 50 : 30),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(LucideIcons.crown, size: 28, color: Color(0xFFF59E0B)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Root Infrastructure Controls',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: isDark ? Colors.white : const Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Manage emergency lockdowns, DB backups, and tenant system switches.',
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
            'SYSTEM TOGGLES & AUTOMATION',
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
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Maintenance Mode', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800)),
                  subtitle: const Text('Temporarily prevents student/parent portal access', style: TextStyle(fontSize: 11)),
                  value: _maintenanceMode,
                  activeThumbColor: const Color(0xFFEF4444),
                  onChanged: (v) => setState(() => _maintenanceMode = v),
                ),
                const Divider(height: 16),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Hubtel SMS Gateway Dispatcher', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800)),
                  subtitle: const Text('Dispatches real-time SMS alerts to phone numbers', style: TextStyle(fontSize: 11)),
                  value: _smsGatewayActive,
                  activeThumbColor: const Color(0xFF10B981),
                  onChanged: (v) => setState(() => _smsGatewayActive = v),
                ),
                const Divider(height: 16),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Biometric Hardware Auto-Sync', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800)),
                  subtitle: const Text('Pulls turnstile entry records every 30 seconds', style: TextStyle(fontSize: 11)),
                  value: _biometricAutoSync,
                  activeThumbColor: const Color(0xFF3B82F6),
                  onChanged: (v) => setState(() => _biometricAutoSync = v),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          Text(
            'DATABASE & SNAPSHOT OPERATIONS',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.1,
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 12),

          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 0,
            ),
            icon: const Icon(LucideIcons.database, size: 18),
            label: const Text('Trigger Full Tenant Cloud Backup (AWS S3)', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Triggered cloud snapshot backup... Complete!')),
              );
            },
          ),
        ],
      ),
    );
  }
}
