import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/admin_drawer.dart';

class AdminStaffPage extends StatelessWidget {
  const AdminStaffPage({super.key});

  final List<Map<String, dynamic>> _staff = const [
    {
      'name': 'Dr. Daniel Darko',
      'role': 'Head of Academics & Science Teacher',
      'phone': '+233 24 456 7890',
      'email': 'd.darko@schoollinx.edu.gh',
      'dept': 'Science Department',
      'status': 'ON DUTY',
      'initials': 'DD',
    },
    {
      'name': 'Mrs. Sarah Owusu',
      'role': 'Mathematics Department Lead',
      'phone': '+233 20 123 4567',
      'email': 's.owusu@schoollinx.edu.gh',
      'dept': 'Mathematics',
      'status': 'ON DUTY',
      'initials': 'SO',
    },
    {
      'name': 'Mr. Kwame Mensah',
      'role': 'Senior Tutor & Form 1 Master',
      'phone': '+233 55 987 6543',
      'email': 'k.mensah@schoollinx.edu.gh',
      'dept': 'Languages & Lit',
      'status': 'ON DUTY',
      'initials': 'KM',
    },
    {
      'name': 'Nurse Victoria Addo',
      'role': 'Campus Medical Officer',
      'phone': '+233 27 345 6789',
      'email': 'clinic@schoollinx.edu.gh',
      'dept': 'Health & Sickbay',
      'status': 'ACTIVE',
      'initials': 'VA',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const AdminDrawer(currentRoute: '/staff'),
      appBar: AppBar(
        title: Text(
          'Faculty & Staff Directory',
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
            icon: Icon(LucideIcons.userPlus, size: 20, color: isDark ? Colors.white : const Color(0xFF0F172A)),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Staff onboarding modal')),
              );
            },
          ),
        ],
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _staff.length,
        separatorBuilder: (_, _) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final s = _staff[index];

          return SlCard(
            padding: const EdgeInsets.all(14),
            borderRadius: BorderRadius.circular(16),
            child: Row(
              children: [
                SlAvatar(
                  initials: s['initials']!,
                  size: 44,
                  backgroundColor: AppColors.primary,
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
                              s['name']!,
                              style: TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w800,
                                color: isDark ? Colors.white : const Color(0xFF0F172A),
                              ),
                            ),
                          ),
                          SlBadge(text: s['status']!, variant: SlBadgeVariant.success),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        s['role']!,
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
                            s['phone']!,
                            style: TextStyle(fontSize: 11, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                          ),
                          const SizedBox(width: 12),
                          Icon(LucideIcons.mail, size: 12, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              s['email']!,
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
