import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

class ParentPTAPage extends StatelessWidget {
  const ParentPTAPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<PtaBloc>()..add(LoadPtaTeachersEvent()),
      child: const _ParentPTAView(),
    );
  }
}

class _ParentPTAView extends StatelessWidget {
  const _ParentPTAView();

  void _bookSlotDialog(BuildContext context, TeacherEntity teacher, TeacherMeetingSlotEntity slot) {
    final notesController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Book Parent-Teacher Meeting', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Teacher: ${teacher.fullName}', style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(
              'Time: ${DateFormat('EEEE, MMM d @ hh:mm a').format(slot.startTime)}',
              style: const TextStyle(color: AppColors.primaryLight, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 16),
            SlInput(
              label: 'Discussion Agenda / Notes',
              controller: notesController,
              maxLines: 3,
              prefixIcon: const Icon(LucideIcons.messageSquare, size: 18),
              hintText: 'e.g. Discuss term 1 math continuous assessment progress.',
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.read<PtaBloc>().add(
                    BookMeetingSlotEvent(
                      slotId: slot.id,
                      guardianId: 'ME',
                      notes: notesController.text.trim(),
                      teacherId: teacher.id,
                    ),
                  );
            },
            child: const Text('Confirm Appointment'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BlocConsumer<PtaBloc, PtaState>(
      listener: (context, state) {
        if (state is PtaBookingSuccessState) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: AppColors.emerald),
          );
        } else if (state is PtaError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: AppColors.rose),
          );
        }
      },
      builder: (context, state) {
        final teachers = state is PtaLoaded ? state.teachers : <TeacherEntity>[];
        final selectedTeacher = state is PtaLoaded ? state.selectedTeacher : null;
        final slots = state is PtaLoaded ? state.slots : <TeacherMeetingSlotEntity>[];

        return Scaffold(
          appBar: AppBar(
            title: const Text('Parent-Teacher Conference (PTA)', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
            actions: [
              IconButton(
                icon: const Icon(LucideIcons.rotateCw, size: 20),
                onPressed: () {
                  if (selectedTeacher != null) {
                    context.read<PtaBloc>().add(LoadTeacherSlotsEvent(selectedTeacher.id));
                  } else {
                    context.read<PtaBloc>().add(LoadPtaTeachersEvent());
                  }
                },
              ),
            ],
          ),
          body: Column(
            children: [
              if (teachers.isNotEmpty)
                Container(
                  height: 48,
                  margin: const EdgeInsets.symmetric(vertical: 8),
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: teachers.length,
                    separatorBuilder: (c, i) => const SizedBox(width: 8),
                    itemBuilder: (context, index) {
                      final t = teachers[index];
                      final isSelected = t.id == selectedTeacher?.id;
                      return ChoiceChip(
                        label: Text(t.fullName),
                        selected: isSelected,
                        onSelected: (selected) {
                          if (selected) {
                            context.read<PtaBloc>().add(SelectPtaTeacherEvent(t));
                          }
                        },
                        selectedColor: AppColors.primary,
                        labelStyle: TextStyle(
                          color: isSelected ? Colors.white : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        ),
                      );
                    },
                  ),
                ),
              Expanded(
                child: Builder(
                  builder: (context) {
                    if (state is PtaLoading) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    if (state is PtaError) {
                      return Center(child: Text(state.message, style: const TextStyle(color: AppColors.rose)));
                    }
                    if (slots.isEmpty) {
                      return Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(LucideIcons.calendarCheck, size: 56, color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                            const SizedBox(height: 12),
                            Text(
                              'No open conference slots for this teacher',
                              style: TextStyle(color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                            ),
                          ],
                        ),
                      );
                    }

                    return ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: slots.length,
                      separatorBuilder: (c, i) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final slot = slots[index];
                        return SlCard(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    DateFormat('EEEE, MMM d').format(slot.startTime),
                                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${DateFormat('hh:mm a').format(slot.startTime)} - ${DateFormat('hh:mm a').format(slot.endTime)}',
                                    style: TextStyle(
                                      color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                              if (slot.isBooked)
                                const SlBadge(text: 'Booked', variant: SlBadgeVariant.danger)
                              else if (selectedTeacher != null)
                                ElevatedButton(
                                  onPressed: () => _bookSlotDialog(context, selectedTeacher, slot),
                                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white),
                                  child: const Text('Book Slot'),
                                ),
                            ],
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
