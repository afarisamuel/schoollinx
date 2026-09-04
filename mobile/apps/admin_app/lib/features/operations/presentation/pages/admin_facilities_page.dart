import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/admin_drawer.dart';

class AdminFacilitiesPage extends StatelessWidget {
  const AdminFacilitiesPage({super.key});

  final List<Map<String, dynamic>> _facilities = const [
    {
      'name': 'Main Assembly Auditorium',
      'capacity': '800 Seats',
      'status': 'AVAILABLE',
      'location': 'Central Campus Wing',
      'icon': LucideIcons.building,
    },
    {
      'name': 'Science Chemistry & Physics Lab 1',
      'capacity': '60 Seats',
      'status': 'OCCUPIED (JHS 2)',
      'location': 'Science Complex Block',
      'icon': LucideIcons.flaskConical,
    },
    {
      'name': 'Computer Science Lab 2 (60 iMacs)',
      'capacity': '60 Seats',
      'status': 'AVAILABLE',
      'location': 'ICT Innovation Hub',
      'icon': LucideIcons.laptop,
    },
    {
      'name': 'Senior High Sports Gymnasium',
      'capacity': '300 Seats',
      'status': 'RESERVED (Cadet Drill)',
      'location': 'Sports Pavilion',
      'icon': LucideIcons.trophy,
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const AdminDrawer(currentRoute: '/facilities'),
      appBar: AppBar(
        title: Text(
          'Campus Facilities & Reservations',
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
          ..._facilities.map((f) {
            final isAvailable = f['status'] == 'AVAILABLE';

            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: SlCard(
                padding: const EdgeInsets.all(16),
                borderRadius: BorderRadius.circular(16),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: (isAvailable ? const Color(0xFF10B981) : const Color(0xFFF59E0B)).withAlpha(isDark ? 50 : 30),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Icon(
                          f['icon'] as IconData,
                          size: 20,
                          color: isAvailable ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            f['name'] as String,
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w800,
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${f['location']} • Capacity: ${f['capacity']}',
                            style: TextStyle(fontSize: 11, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ),
                    SlBadge(
                      text: isAvailable ? 'AVAILABLE' : 'RESERVED',
                      variant: isAvailable ? SlBadgeVariant.success : SlBadgeVariant.warning,
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
