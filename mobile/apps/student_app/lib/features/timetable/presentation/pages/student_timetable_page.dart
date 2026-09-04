import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/student_drawer.dart';

class StudentTimetablePage extends StatelessWidget {
  const StudentTimetablePage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<TimetableBloc>()..add(const LoadClassTimetableEvent('class-1')),
      child: const _StudentTimetableView(),
    );
  }
}

class _StudentTimetableView extends StatefulWidget {
  const _StudentTimetableView();

  @override
  State<_StudentTimetableView> createState() => _StudentTimetableViewState();
}

class _StudentTimetableViewState extends State<_StudentTimetableView> {
  int _selectedDay = 0;
  final List<String> _days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final currentDay = _days[_selectedDay];

    return Scaffold(
      drawer: const StudentDrawer(currentRoute: '/timetable'),
      appBar: AppBar(
        title: const Text('My Class Schedule', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, size: 18),
            onPressed: () {
              context.read<TimetableBloc>().add(const LoadClassTimetableEvent('class-1'));
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Days Row
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Row(
                children: List.generate(_days.length, (index) {
                  final isSelected = _selectedDay == index;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(_days[index]),
                      selected: isSelected,
                      selectedColor: AppColors.primary,
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.white : (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                      onSelected: (val) {
                        if (val) setState(() => _selectedDay = index);
                      },
                    ),
                  );
                }),
              ),
            ),

            // Schedule List
            Expanded(
              child: BlocBuilder<TimetableBloc, TimetableState>(
                builder: (context, state) {
                  if (state is TimetableLoading) {
                    return const Center(child: CircularProgressIndicator());
                  }

                  if (state is TimetableError) {
                    return Center(child: Text(state.message, style: const TextStyle(color: AppColors.rose)));
                  }

                  final allEntries = state is TimetableLoaded ? state.allEntries : <TimetableEntryEntity>[];
                  final dayEntries = allEntries.where((e) => e.dayOfWeek.toLowerCase() == currentDay.toLowerCase()).toList();

                  if (dayEntries.isEmpty) {
                    return Center(
                      child: Text(
                        'No scheduled lessons for $currentDay.',
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    );
                  }

                  return ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: dayEntries.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final p = dayEntries[index];

                      return SlCard(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
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
                                Text('${p.startTime} - ${p.endTime}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                              ],
                            ),
                            const SizedBox(width: 16),
                            Container(
                              width: 2,
                              height: 52,
                              color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    p.subject,
                                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Room: ${p.room} • ${p.teacherName}',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                                    ),
                                  ),
                                ],
                              ),
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
      ),
    );
  }
}
