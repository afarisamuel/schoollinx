import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

class StudentPortfolioPage extends StatefulWidget {
  const StudentPortfolioPage({super.key});

  @override
  State<StudentPortfolioPage> createState() => _StudentPortfolioPageState();
}

class _StudentPortfolioPageState extends State<StudentPortfolioPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    context.read<HouseMeritBloc>().add(const LoadHouseLeaderboardEvent());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          'Student Portfolio & Houses',
          style: GoogleFonts.outfit(fontWeight: FontWeight.w700, color: const Color(0xFF0F172A)),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFF2563EB),
          unselectedLabelColor: const Color(0xFF64748B),
          indicatorColor: const Color(0xFF2563EB),
          labelStyle: GoogleFonts.inter(fontWeight: FontWeight.w600),
          tabs: const [
            Tab(text: 'House Leaderboard'),
            Tab(text: 'My Badges & Awards'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // House Leaderboard Tab
          BlocBuilder<HouseMeritBloc, HouseMeritState>(
            builder: (context, state) {
              if (state is HouseMeritLoadingState) {
                return const Center(child: CircularProgressIndicator());
              }

              if (state is HouseLeaderboardLoadedState) {
                final houses = state.houses;

                return ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF4F46E5), Color(0xFF3730A3)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.white.withAlpha(38),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.shield, color: Colors.amber, size: 32),
                          ),
                          const SizedBox(width: 16),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Inter-House Championship',
                                style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFFC7D2FE)),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '2025/2026 Academic Cup',
                                style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    ...houses.asMap().entries.map((entry) {
                      final index = entry.key;
                      final house = entry.value;

                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        child: ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          leading: CircleAvatar(
                            backgroundColor: index == 0
                                ? Colors.amber
                                : (index == 1 ? Colors.grey[300] : (index == 2 ? Colors.brown[300] : const Color(0xFFE2E8F0))),
                            child: Text(
                              '#${index + 1}',
                              style: GoogleFonts.outfit(
                                fontWeight: FontWeight.w800,
                                color: index == 0 ? Colors.black87 : const Color(0xFF0F172A),
                              ),
                            ),
                          ),
                          title: Text(
                            house.name,
                            style: GoogleFonts.outfit(fontWeight: FontWeight.w700, fontSize: 16),
                          ),
                          subtitle: Text(
                            'House Master: ${house.houseMaster}\n"${house.motto}"',
                            style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF64748B)),
                          ),
                          trailing: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                '${house.totalPoints}',
                                style: GoogleFonts.outfit(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                  color: const Color(0xFF2563EB),
                                ),
                              ),
                              Text(
                                'Points',
                                style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF94A3B8)),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ],
                );
              }

              return const SizedBox();
            },
          ),

          // Badges & Achievements Tab
          ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                'Earned Honor Badges',
                style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w700, color: const Color(0xFF0F172A)),
              ),
              const SizedBox(height: 12),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.1,
                children: [
                  _buildBadgeCard('Math Olympiad', 'Gold Medalist 2026', Icons.calculate, const Color(0xFFF59E0B)),
                  _buildBadgeCard('100% Attendance', 'Term 1 Perfect Streak', Icons.verified_user, const Color(0xFF10B981)),
                  _buildBadgeCard('Debate Society', 'Best Speaker Award', Icons.record_voice_over, const Color(0xFF8B5CF6)),
                  _buildBadgeCard('Robotics Club', 'Regional Semi-Finalist', Icons.smart_toy, const Color(0xFF3B82F6)),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBadgeCard(String title, String subtitle, IconData icon, Color color) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: color.withAlpha(30), shape: BoxShape.circle),
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(height: 10),
            Text(
              title,
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF0F172A)),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF64748B)),
            ),
          ],
        ),
      ),
    );
  }
}
