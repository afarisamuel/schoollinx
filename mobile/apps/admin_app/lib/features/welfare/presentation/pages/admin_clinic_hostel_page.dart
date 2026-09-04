import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

class AdminClinicHostelPage extends StatefulWidget {
  const AdminClinicHostelPage({super.key});

  @override
  State<AdminClinicHostelPage> createState() => _AdminClinicHostelPageState();
}

class _AdminClinicHostelPageState extends State<AdminClinicHostelPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    context.read<WelfareBloc>().add(const LoadActiveClinicVisitsEvent());
    context.read<WelfareBloc>().add(const LoadHostelRoomsEvent());
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
          'Campus Clinic & Boarding',
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
            Tab(text: 'Clinic Triage & Sickbay'),
            Tab(text: 'Hostel Bed Occupancy'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Clinic Triage Tab
          BlocBuilder<WelfareBloc, WelfareState>(
            builder: (context, state) {
              if (state is WelfareLoadingState) {
                return const Center(child: CircularProgressIndicator());
              }

              if (state is ActiveClinicVisitsLoadedState) {
                final visits = state.visits;

                return ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: _buildMetricTile('Active Patients', '${visits.length}', Icons.healing, const Color(0xFFEF4444)),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildMetricTile('Sickbay Beds', '8 / 12 Free', Icons.bed, const Color(0xFF10B981)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    Text(
                      'Live Triage Queue',
                      style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w700, color: const Color(0xFF0F172A)),
                    ),
                    const SizedBox(height: 12),
                    if (visits.isEmpty)
                      const Center(
                        child: Padding(
                          padding: EdgeInsets.symmetric(vertical: 40),
                          child: Text('No active patients in clinic triage queue.'),
                        ),
                      )
                    else
                      ...visits.map((visit) {
                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                            side: const BorderSide(color: Color(0xFFE2E8F0)),
                          ),
                          child: ListTile(
                            title: Text(
                              visit.studentName,
                              style: GoogleFonts.outfit(fontWeight: FontWeight.w700),
                            ),
                            subtitle: Text(
                              '${visit.diagnosis} • Checked in ${DateFormat('hh:mm a').format(visit.checkInTime)}',
                              style: GoogleFonts.inter(fontSize: 12),
                            ),
                            trailing: Chip(
                              label: Text(
                                visit.triageLevel,
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white),
                              ),
                              backgroundColor: visit.triageLevel == 'EMERGENCY'
                                  ? const Color(0xFFEF4444)
                                  : (visit.triageLevel == 'URGENT' ? const Color(0xFFF59E0B) : const Color(0xFF10B981)),
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

          // Hostel Tab
          BlocBuilder<WelfareBloc, WelfareState>(
            builder: (context, state) {
              if (state is HostelRoomsLoadedState) {
                final rooms = state.rooms;

                return ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Text(
                      'Boarding Houses & Room Capacity',
                      style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w700, color: const Color(0xFF0F172A)),
                    ),
                    const SizedBox(height: 12),
                    ...rooms.map((room) {
                      final pct = room.capacity > 0 ? (room.occupiedBeds / room.capacity) : 0.0;

                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    '${room.hostelName} - Room ${room.roomNumber}',
                                    style: GoogleFonts.outfit(fontWeight: FontWeight.w700, fontSize: 16),
                                  ),
                                  Chip(
                                    label: Text(room.gender, style: const TextStyle(fontSize: 11)),
                                    backgroundColor: room.gender == 'MALE' ? const Color(0xFFDBEAFE) : const Color(0xFFFCE7F3),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              LinearProgressIndicator(
                                value: pct,
                                backgroundColor: const Color(0xFFE2E8F0),
                                color: pct >= 1.0 ? const Color(0xFFEF4444) : const Color(0xFF2563EB),
                                minHeight: 8,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    '${room.occupiedBeds} of ${room.capacity} Beds Occupied',
                                    style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF64748B)),
                                  ),
                                  Text(
                                    room.isFull ? 'FULL' : '${room.capacity - room.occupiedBeds} AVAILABLE',
                                    style: GoogleFonts.inter(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: room.isFull ? const Color(0xFFEF4444) : const Color(0xFF10B981),
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
                );
              }

              return const SizedBox();
            },
          ),
        ],
      ),
    );
  }

  Widget _buildMetricTile(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 8),
          Text(value, style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w700, color: const Color(0xFF0F172A))),
          Text(title, style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF64748B))),
        ],
      ),
    );
  }
}
