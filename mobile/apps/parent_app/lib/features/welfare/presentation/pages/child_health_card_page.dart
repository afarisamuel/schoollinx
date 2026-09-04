import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

class ChildHealthCardPage extends StatefulWidget {
  final String studentId;
  final String studentName;

  const ChildHealthCardPage({
    super.key,
    required this.studentId,
    required this.studentName,
  });

  @override
  State<ChildHealthCardPage> createState() => _ChildHealthCardPageState();
}

class _ChildHealthCardPageState extends State<ChildHealthCardPage> {
  @override
  void initState() {
    super.initState();
    context.read<WelfareBloc>().add(LoadStudentClinicVisitsEvent(widget.studentId));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          'Health Card & Clinic',
          style: GoogleFonts.outfit(fontWeight: FontWeight.w700, color: const Color(0xFF0F172A)),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Medical Profile Banner
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF059669), Color(0xFF047857)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      widget.studentName,
                      style: GoogleFonts.outfit(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withAlpha(50),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        'Blood: O+ Pos',
                        style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded, color: Colors.amberAccent, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Allergies: Penicillin, Dust Pollen',
                        style: GoogleFonts.inter(fontSize: 13, color: Colors.white),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Clinic Visit Log',
            style: GoogleFonts.outfit(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 12),
          BlocBuilder<WelfareBloc, WelfareState>(
            builder: (context, state) {
              if (state is WelfareLoadingState) {
                return const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()));
              }

              if (state is StudentClinicVisitsLoadedState) {
                final visits = state.visits;

                if (visits.isEmpty) {
                  return Card(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        children: [
                          const Icon(Icons.favorite_border, size: 48, color: Color(0xFF10B981)),
                          const SizedBox(height: 12),
                          Text(
                            'No clinic visits recorded this term',
                            style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w500, color: const Color(0xFF64748B)),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Your child has had a clean health record!',
                            style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF94A3B8)),
                          ),
                        ],
                      ),
                    ),
                  );
                }

                return Column(
                  children: visits.map((visit) {
                    final triageColor = visit.triageLevel == 'EMERGENCY'
                        ? const Color(0xFFEF4444)
                        : (visit.triageLevel == 'URGENT' ? const Color(0xFFF59E0B) : const Color(0xFF10B981));

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      width: 10,
                                      height: 10,
                                      decoration: BoxDecoration(color: triageColor, shape: BoxShape.circle),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      '${visit.triageLevel} VISIT',
                                      style: GoogleFonts.outfit(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                        color: const Color(0xFF0F172A),
                                      ),
                                    ),
                                  ],
                                ),
                                Text(
                                  DateFormat('dd MMM yyyy, hh:mm a').format(visit.checkInTime),
                                  style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF94A3B8)),
                                ),
                              ],
                            ),
                            const Divider(height: 20),
                            Text(
                              'Diagnosis: ${visit.diagnosis}',
                              style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: const Color(0xFF334155)),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Treatment: ${visit.treatmentGiven}',
                              style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF64748B)),
                            ),
                            if (visit.temperature != null) ...[
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  const Icon(Icons.thermostat, size: 16, color: Color(0xFFE11D48)),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Temp: ${visit.temperature}°C',
                                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500),
                                  ),
                                  if (visit.bloodPressure != null) ...[
                                    const SizedBox(width: 16),
                                    const Icon(Icons.monitor_heart, size: 16, color: Color(0xFF2563EB)),
                                    const SizedBox(width: 4),
                                    Text(
                                      'BP: ${visit.bloodPressure}',
                                      style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500),
                                    ),
                                  ],
                                ],
                              ),
                            ],
                            const SizedBox(height: 8),
                            Text(
                              'Attending Nurse: ${visit.attendingNurse}',
                              style: GoogleFonts.inter(fontSize: 11, fontStyle: FontStyle.italic, color: const Color(0xFF94A3B8)),
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                );
              }

              return const SizedBox();
            },
          ),
        ],
      ),
    );
  }
}
