import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/parent_drawer.dart';

class ParentPickupPassPage extends StatelessWidget {
  const ParentPickupPassPage({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const ParentDrawer(currentRoute: '/pickup-pass'),
      appBar: AppBar(
        title: Text(
          'Security Gate Dismissal Pass',
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
            padding: const EdgeInsets.all(20),
            borderRadius: BorderRadius.circular(20),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('AUTHORIZED GUARDIAN', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppColors.primary)),
                    const SlBadge(text: 'ACTIVE PASS', variant: SlBadgeVariant.success),
                  ],
                ),
                const SizedBox(height: 16),

                // QR Code Display Box
                Container(
                  width: 180,
                  height: 180,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0), width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withAlpha(20),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(LucideIcons.qrCode, size: 120, color: Color(0xFF0F172A)),
                        const SizedBox(height: 4),
                        Text(
                          'PASS #PKP-9082-GH',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.8,
                            color: Colors.grey.shade700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                Text(
                  'Kofi Darko (Primary 4B)',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Guardian: Mrs. Elizabeth Darko (+233 24 112 3344)',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                  ),
                ),
                const Divider(height: 24),
                Row(
                  children: [
                    const Icon(LucideIcons.shieldCheck, size: 16, color: Color(0xFF10B981)),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Present this dynamic QR code at the campus security gate during 03:00 PM dismissal.',
                        style: TextStyle(
                          fontSize: 11,
                          color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
