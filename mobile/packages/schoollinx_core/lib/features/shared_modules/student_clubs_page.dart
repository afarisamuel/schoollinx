import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_colors.dart';
import '../common_widgets/sl_card.dart';
import '../common_widgets/sl_badge.dart';

class StudentClubsPage extends StatelessWidget {
  final Widget? drawer;
  const StudentClubsPage({super.key, this.drawer});

  final List<Map<String, dynamic>> _clubs = const [
    {
      'name': 'Robotics & STEM Innovators',
      'patron': 'Mr. Kwame Boateng',
      'members': 45,
      'meeting': 'Every Thursday, 3:30 PM',
      'location': 'Tech Lab 2',
      'category': 'Technology & Science',
      'icon': LucideIcons.cpu,
      'color': Color(0xFF3B82F6),
      'status': 'Active',
      'joined': true,
    },
    {
      'name': 'National Debate & Model UN Club',
      'patron': 'Mrs. Angela Forson',
      'members': 38,
      'meeting': 'Every Tuesday, 4:00 PM',
      'location': 'Auditorium Hall B',
      'category': 'Leadership & Oratory',
      'icon': LucideIcons.mic,
      'color': Color(0xFF8B5CF6),
      'status': 'Active',
      'joined': false,
    },
    {
      'name': 'Cadet Corps & Drill Brigade',
      'patron': 'Capt. (Rtd) O. Mensah',
      'members': 62,
      'meeting': 'Saturday Morning, 7:00 AM',
      'location': 'School Parade Grounds',
      'category': 'Discipline & Sports',
      'icon': LucideIcons.shield,
      'color': Color(0xFF10B981),
      'status': 'Active',
      'joined': false,
    },
    {
      'name': 'Drama & Cultural Heritage Troupe',
      'patron': 'Ms. Abena Kwarteng',
      'members': 28,
      'meeting': 'Friday, 3:30 PM',
      'location': 'Arts Studio',
      'category': 'Creative Arts',
      'icon': LucideIcons.smile,
      'color': Color(0xFFF59E0B),
      'status': 'Active',
      'joined': true,
    },
    {
      'name': 'Red Cross & First Aid Society',
      'patron': 'Nurse Victoria Addo',
      'members': 34,
      'meeting': 'Wednesday, 4:00 PM',
      'location': 'School Clinic Annex',
      'category': 'Community & Health',
      'icon': LucideIcons.heartPulse,
      'color': Color(0xFFEF4444),
      'status': 'Active',
      'joined': false,
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: drawer,
      appBar: AppBar(
        title: Text(
          'Student Clubs & Societies',
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
          // Banner
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF1E1B4B), Color(0xFF312E81)],
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF312E81).withAlpha(80),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withAlpha(20),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(LucideIcons.award, size: 28, color: Colors.white),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Extracurricular Excellence',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white),
                      ),
                      SizedBox(height: 3),
                      Text(
                        'Join student societies to earn house merit badges and leadership honors.',
                        style: TextStyle(fontSize: 11.5, color: Color(0xFFC7D2FE)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          Text(
            'AVAILABLE CLUBS & ORGANIZATIONS',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.1,
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 12),

          ..._clubs.map((club) {
            final color = club['color'] as Color;
            final isJoined = club['joined'] as bool;

            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: SlCard(
                padding: const EdgeInsets.all(14),
                borderRadius: BorderRadius.circular(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: color.withAlpha(isDark ? 50 : 30),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Center(
                            child: Icon(club['icon'] as IconData, size: 22, color: color),
                          ),
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
                                      club['name'],
                                      style: TextStyle(
                                        fontSize: 13.5,
                                        fontWeight: FontWeight.w800,
                                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                                      ),
                                    ),
                                  ),
                                  if (isJoined)
                                    const SlBadge(text: 'ENROLLED', variant: SlBadgeVariant.success)
                                  else
                                    const SlBadge(text: 'OPEN', variant: SlBadgeVariant.primary),
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${club['category']} • Patron: ${club['patron']}',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white.withAlpha(10) : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          Icon(LucideIcons.calendar, size: 14, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                          const SizedBox(width: 6),
                          Text(
                            club['meeting'],
                            style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: isDark ? Colors.white : const Color(0xFF1E293B),
                            ),
                          ),
                          const Spacer(),
                          Icon(LucideIcons.mapPin, size: 14, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                          const SizedBox(width: 6),
                          Text(
                            club['location'],
                            style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w600,
                              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${club['members']} active members',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                          ),
                        ),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isJoined ? const Color(0xFFEF4444).withAlpha(30) : AppColors.primary,
                            foregroundColor: isJoined ? const Color(0xFFEF4444) : Colors.white,
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(isJoined ? 'Left ${club['name']}' : 'Applied to join ${club['name']}!'),
                              ),
                            );
                          },
                          child: Text(
                            isJoined ? 'Leave Club' : 'Join Society',
                            style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800),
                          ),
                        ),
                      ],
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
