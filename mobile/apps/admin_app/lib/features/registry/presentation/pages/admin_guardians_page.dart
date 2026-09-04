import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/admin_drawer.dart';

class AdminGuardiansPage extends StatelessWidget {
  const AdminGuardiansPage({super.key});

  final List<Map<String, dynamic>> _guardians = const [
    {
      'name': 'Mrs. Elizabeth Darko',
      'relation': 'Mother of Kofi Darko (Primary 4B)',
      'phone': '+233 24 112 3344',
      'email': 'elizabeth.darko@gmail.com',
      'residence': 'East Legon, Accra',
      'verified': true,
      'initials': 'ED',
    },
    {
      'name': 'Mr. Samuel Mensah',
      'relation': 'Father of Ama Mensah (JHS 2)',
      'phone': '+233 20 998 7766',
      'email': 's.mensah@enterprise.com.gh',
      'residence': 'Airport Hills, Accra',
      'verified': true,
      'initials': 'SM',
    },
    {
      'name': 'Dr. & Mrs. K. Asante',
      'relation': 'Parents of Kwabena Asante (SHS 1)',
      'phone': '+233 55 443 2211',
      'email': 'asante.med@yahoo.com',
      'residence': 'Cantonments, Accra',
      'verified': true,
      'initials': 'KA',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const AdminDrawer(currentRoute: '/guardians'),
      appBar: AppBar(
        title: Text(
          'Guardians & PTA Directory',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: isDark ? Colors.white : const Color(0xFF0F172A),
          ),
        ),
        backgroundColor: isDark ? const Color(0xFF0D1526) : Colors.white,
        elevation: 0,
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _guardians.length,
        separatorBuilder: (_, _) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final g = _guardians[index];

          return SlCard(
            padding: const EdgeInsets.all(14),
            borderRadius: BorderRadius.circular(16),
            child: Row(
              children: [
                SlAvatar(
                  initials: g['initials']!,
                  size: 44,
                  backgroundColor: const Color(0xFF10B981),
                  textColor: Colors.white,
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
                              g['name']!,
                              style: TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w800,
                                color: isDark ? Colors.white : const Color(0xFF0F172A),
                              ),
                            ),
                          ),
                          const SlBadge(text: 'VERIFIED', variant: SlBadgeVariant.success),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        g['relation']!,
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                          color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(LucideIcons.phone, size: 12, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                          const SizedBox(width: 4),
                          Text(
                            g['phone']!,
                            style: TextStyle(fontSize: 11, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                          ),
                          const SizedBox(width: 12),
                          Icon(LucideIcons.mapPin, size: 12, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              g['residence']!,
                              style: TextStyle(fontSize: 11, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
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
        },
      ),
    );
  }
}
