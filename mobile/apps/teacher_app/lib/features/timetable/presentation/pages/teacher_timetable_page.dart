import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/teacher_drawer.dart';

class TeacherTimetablePage extends StatelessWidget {
  const TeacherTimetablePage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<TimetableBloc>()..add(const LoadTeacherTimetableEvent('teacher-1')),
      child: const _TeacherTimetableView(),
    );
  }
}

class _TeacherTimetableView extends StatefulWidget {
  const _TeacherTimetableView();

  @override
  State<_TeacherTimetableView> createState() => _TeacherTimetableViewState();
}

class _TeacherTimetableViewState extends State<_TeacherTimetableView> {
  final List<String> _days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BlocBuilder<TimetableBloc, TimetableState>(
      builder: (context, state) {
        String selectedDay = 'MONDAY';
        List<TimetableEntryEntity> dayEntries = [];

        if (state is TimetableLoaded) {
          selectedDay = state.selectedDay;
          dayEntries = state.filteredEntries;
        }

        return Scaffold(
          drawer: const TeacherDrawer(currentRoute: '/timetable'),
          appBar: AppBar(
            title: const Text('Faculty Timetable', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
            actions: [
              IconButton(
                icon: const Icon(LucideIcons.refreshCw, size: 18),
                onPressed: () {
                  context.read<TimetableBloc>().add(const LoadTeacherTimetableEvent('teacher-1'));
                },
              ),
            ],
          ),
          body: SafeArea(
            child: Column(
              children: [
                // Day selector pills
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    children: _days.map((day) {
                      final isSelected = selectedDay.toUpperCase() == day.toUpperCase();
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(day.substring(0, 1) + day.substring(1).toLowerCase()),
                          selected: isSelected,
                          selectedColor: AppColors.primary,
                          labelStyle: TextStyle(
                            color: isSelected ? Colors.white : (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                          ),
                          onSelected: (val) {
                            if (val) {
                              context.read<TimetableBloc>().add(FilterTimetableByDayEvent(day));
                            }
                          },
                        ),
                      );
                    }).toList(),
                  ),
                ),

                // Period Schedule List
                Expanded(
                  child: state is TimetableLoading
                      ? const Center(child: CircularProgressIndicator())
                      : dayEntries.isEmpty
                          ? Center(
                              child: Text(
                                'No lecture periods assigned for $selectedDay.',
                                style: const TextStyle(fontWeight: FontWeight.w700),
                              ),
                            )
                          : ListView.separated(
                              padding: const EdgeInsets.all(16),
                              itemCount: dayEntries.length,
                              separatorBuilder: (context, index) => const SizedBox(height: 12),
                              itemBuilder: (context, index) {
                                final slot = dayEntries[index];

                                return SlCard(
                                  padding: const EdgeInsets.all(16),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      // Time Column
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Period ${index + 1}',
                                            style: const TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w800,
                                              color: AppColors.primaryLight,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            '${slot.startTime} - ${slot.endTime}',
                                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                                          ),
                                        ],
                                      ),

                                      const SizedBox(width: 16),

                                      // Divider line
                                      Container(
                                        width: 2,
                                        height: 52,
                                        color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                                      ),

                                      const SizedBox(width: 16),

                                      // Lesson Info
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                              children: [
                                                Text(
                                                  slot.room,
                                                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                                                ),
                                                const SlBadge(
                                                  text: 'Assigned',
                                                  variant: SlBadgeVariant.primary,
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              slot.subject,
                                              style: TextStyle(
                                                fontSize: 12,
                                                fontWeight: FontWeight.w600,
                                                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
