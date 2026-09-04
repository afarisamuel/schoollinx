import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/teacher_drawer.dart';

class TeacherLeavePage extends StatefulWidget {
  const TeacherLeavePage({super.key});

  @override
  State<TeacherLeavePage> createState() => _TeacherLeavePageState();
}

class _TeacherLeavePageState extends State<TeacherLeavePage> {
  final _reasonController = TextEditingController();
  String _selectedLeaveType = 'ANNUAL';
  DateTime _startDate = DateTime.now().add(const Duration(days: 1));
  DateTime _endDate = DateTime.now().add(const Duration(days: 3));

  @override
  void initState() {
    super.initState();
    context.read<HrPortalBloc>().add(const LoadMyLeavesEvent());
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  void _showApplyLeaveModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (bottomSheetCtx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            final isDark = Theme.of(ctx).brightness == Brightness.dark;
            final days = _endDate.difference(_startDate).inDays + 1;
            return Padding(
              padding: EdgeInsets.only(
                left: 24,
                right: 24,
                top: 24,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Apply for Staff Leave',
                        style: GoogleFonts.outfit(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'LEAVE TYPE',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                    ),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    initialValue: _selectedLeaveType,
                    decoration: InputDecoration(
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'ANNUAL', child: Text('Annual Leave')),
                      DropdownMenuItem(value: 'SICK', child: Text('Sick Leave')),
                      DropdownMenuItem(value: 'MATERNITY', child: Text('Maternity / Paternity')),
                      DropdownMenuItem(value: 'COMPASSIONATE', child: Text('Compassionate Leave')),
                      DropdownMenuItem(value: 'STUDY', child: Text('Study & Examination')),
                    ],
                    onChanged: (val) {
                      if (val != null) {
                        setModalState(() => _selectedLeaveType = val);
                      }
                    },
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'DURATION ($days DAYS)',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          icon: const Icon(Icons.calendar_today, size: 16),
                          label: Text(DateFormat('dd MMM yyyy').format(_startDate)),
                          onPressed: () async {
                            final picked = await showDatePicker(
                              context: ctx,
                              initialDate: _startDate,
                              firstDate: DateTime.now(),
                              lastDate: DateTime.now().add(const Duration(days: 365)),
                            );
                            if (picked != null) {
                              setModalState(() {
                                _startDate = picked;
                                if (_endDate.isBefore(_startDate)) {
                                  _endDate = _startDate.add(const Duration(days: 1));
                                }
                              });
                            }
                          },
                        ),
                      ),
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 8),
                        child: Icon(Icons.arrow_forward, size: 16),
                      ),
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          icon: const Icon(Icons.event, size: 16),
                          label: Text(DateFormat('dd MMM yyyy').format(_endDate)),
                          onPressed: () async {
                            final picked = await showDatePicker(
                              context: ctx,
                              initialDate: _endDate,
                              firstDate: _startDate,
                              lastDate: DateTime.now().add(const Duration(days: 365)),
                            );
                            if (picked != null) {
                              setModalState(() => _endDate = picked);
                            }
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'REASON / DETAILS',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _reasonController,
                    maxLines: 3,
                    decoration: InputDecoration(
                      hintText: 'Provide handover details or reason for leave...',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      onPressed: () {
                        if (_reasonController.text.trim().isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Please enter a reason for leave')),
                          );
                          return;
                        }
                        context.read<HrPortalBloc>().add(ApplyLeaveEvent(
                              leaveType: _selectedLeaveType,
                              startDate: _startDate,
                              endDate: _endDate,
                              reason: _reasonController.text.trim(),
                            ));
                        Navigator.pop(ctx);
                        _reasonController.clear();
                      },
                      child: Text(
                        'Submit Application',
                        style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const TeacherDrawer(currentRoute: '/leave'),
      appBar: AppBar(
        title: const Text('Staff Leave & Absences', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add, color: Colors.white),
        label: Text('Apply Leave', style: GoogleFonts.inter(fontWeight: FontWeight.w600, color: Colors.white)),
        onPressed: _showApplyLeaveModal,
      ),
      body: BlocConsumer<HrPortalBloc, HrPortalState>(
        listener: (context, state) {
          if (state is LeaveAppliedState) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                backgroundColor: Color(0xFF10B981),
                content: Text('Leave request submitted successfully!'),
              ),
            );
            context.read<HrPortalBloc>().add(const LoadMyLeavesEvent());
          } else if (state is HrPortalErrorState) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(backgroundColor: const Color(0xFFEF4444), content: Text(state.message)),
            );
          }
        },
        builder: (context, state) {
          if (state is HrPortalLoadingState) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is MyLeavesLoadedState) {
            final leaves = state.leaves;

            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Leave balance summary card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
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
                          color: Colors.white.withAlpha(25),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.beach_access, color: Colors.amber, size: 28),
                      ),
                      const SizedBox(width: 16),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Annual Leave Balance',
                            style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF94A3B8)),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '18 Days Remaining',
                            style: GoogleFonts.outfit(
                              fontSize: 22,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'Application History',
                  style: GoogleFonts.outfit(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 12),
                if (leaves.isEmpty)
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 40),
                      child: Column(
                        children: [
                          Icon(Icons.event_available, size: 48, color: Colors.grey[400]),
                          const SizedBox(height: 12),
                          Text(
                            'No leave applications recorded yet',
                            style: GoogleFonts.inter(fontSize: 14, color: const Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  ...leaves.map((leave) {
                    final statusColor = leave.status == 'APPROVED'
                        ? const Color(0xFF10B981)
                        : (leave.status == 'REJECTED' ? const Color(0xFFEF4444) : const Color(0xFFF59E0B));

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      elevation: 0,
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
                                Text(
                                  '${leave.leaveType} LEAVE',
                                  style: GoogleFonts.outfit(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: const Color(0xFF0F172A),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: statusColor.withAlpha(25),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    leave.status,
                                    style: GoogleFonts.inter(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: statusColor,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              '${DateFormat('dd MMM').format(leave.startDate)} – ${DateFormat('dd MMM yyyy').format(leave.endDate)} (${leave.daysCount} days)',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                                color: const Color(0xFF475569),
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              leave.reason,
                              style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF64748B)),
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
    );
  }
}
