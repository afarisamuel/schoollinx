import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/parent_drawer.dart';

class ParentAbsencePage extends StatelessWidget {
  const ParentAbsencePage({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(
          create: (context) => sl<AbsenceBloc>()..add(LoadAbsenceRequestsEvent()),
        ),
        BlocProvider(
          create: (context) => sl<GuardianBloc>()..add(LoadGuardianChildrenEvent()),
        ),
      ],
      child: const _ParentAbsenceView(),
    );
  }
}

class _ParentAbsenceView extends StatelessWidget {
  const _ParentAbsenceView();

  void _showSubmitDialog(BuildContext context, List<ChildEntity> children) {
    if (children.isEmpty) return;
    String selectedStudentId = children.first.id;
    final reasonController = TextEditingController();
    DateTime startDate = DateTime.now().add(const Duration(days: 1));
    DateTime endDate = DateTime.now().add(const Duration(days: 1));

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        final isDark = Theme.of(context).brightness == Brightness.dark;
        return StatefulBuilder(
          builder: (bottomSheetContext, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(
                top: 24,
                left: 20,
                right: 20,
                bottom: MediaQuery.of(bottomSheetContext).viewInsets.bottom + 24,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Excuse of Absence', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                        IconButton(icon: const Icon(LucideIcons.x, size: 20), onPressed: () => Navigator.pop(ctx)),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const Text('Select Student:', style: TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      initialValue: selectedStudentId,
                      items: children
                          .map((c) => DropdownMenuItem(value: c.id, child: Text('${c.fullName} (${c.className})')))
                          .toList(),
                      onChanged: (val) {
                        if (val != null) setSheetState(() => selectedStudentId = val);
                      },
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () async {
                              final picked = await showDatePicker(
                                context: context,
                                initialDate: startDate,
                                firstDate: DateTime.now(),
                                lastDate: DateTime.now().add(const Duration(days: 90)),
                              );
                              if (picked != null) {
                                setSheetState(() {
                                  startDate = picked;
                                  if (endDate.isBefore(startDate)) endDate = startDate;
                                });
                              }
                            },
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.darkBgSecondary : AppColors.lightBgSecondary,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Start Date', style: TextStyle(color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted, fontSize: 11)),
                                  const SizedBox(height: 4),
                                  Text(DateFormat('MMM d, yyyy').format(startDate), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: InkWell(
                            onTap: () async {
                              final picked = await showDatePicker(
                                context: context,
                                initialDate: endDate,
                                firstDate: startDate,
                                lastDate: DateTime.now().add(const Duration(days: 90)),
                              );
                              if (picked != null) {
                                setSheetState(() => endDate = picked);
                              }
                            },
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.darkBgSecondary : AppColors.lightBgSecondary,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('End Date', style: TextStyle(color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted, fontSize: 11)),
                                  const SizedBox(height: 4),
                                  Text(DateFormat('MMM d, yyyy').format(endDate), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    SlInput(
                      label: 'Reason for Absence',
                      controller: reasonController,
                      maxLines: 3,
                      prefixIcon: const Icon(LucideIcons.fileText, size: 18),
                      hintText: 'e.g. Medical appointment or family event',
                    ),
                    const SizedBox(height: 24),
                    SlButton(
                      text: 'Submit Request',
                      icon: const Icon(LucideIcons.send, size: 18, color: Colors.white),
                      onPressed: () {
                        if (reasonController.text.trim().isEmpty) return;
                        context.read<AbsenceBloc>().add(
                              SubmitAbsenceExcuseEvent(
                                studentId: selectedStudentId,
                                reason: reasonController.text.trim(),
                                startDate: startDate,
                                endDate: endDate,
                              ),
                            );
                        Navigator.pop(ctx);
                      },
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BlocConsumer<AbsenceBloc, AbsenceState>(
      listener: (context, state) {
        if (state is AbsenceSubmittedSuccessState) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: AppColors.emerald),
          );
        } else if (state is AbsenceError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: AppColors.rose),
          );
        }
      },
      builder: (context, absenceState) {
        return BlocBuilder<GuardianBloc, GuardianState>(
          builder: (context, guardianState) {
            final children = guardianState is GuardianChildrenLoaded ? guardianState.children : <ChildEntity>[];

            return Scaffold(
              drawer: const ParentDrawer(currentRoute: '/absence'),
              appBar: AppBar(
                title: const Text('Absence Excuses', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                actions: [
                  IconButton(
                    icon: const Icon(LucideIcons.rotateCw, size: 20),
                    onPressed: () {
                      context.read<AbsenceBloc>().add(LoadAbsenceRequestsEvent());
                      context.read<GuardianBloc>().add(LoadGuardianChildrenEvent());
                    },
                  ),
                ],
              ),
              floatingActionButton: FloatingActionButton.extended(
                onPressed: () => _showSubmitDialog(context, children),
                icon: const Icon(LucideIcons.plus, size: 18, color: Colors.white),
                label: const Text('New Request', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                backgroundColor: AppColors.primary,
              ),
              body: Builder(
                builder: (context) {
                  if (absenceState is AbsenceLoading) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (absenceState is AbsenceError) {
                    return Center(child: Text(absenceState.message, style: const TextStyle(color: AppColors.rose)));
                  }

                  final requests = absenceState is AbsenceRequestsLoaded ? absenceState.requests : <AbsenceRequestEntity>[];

                  if (requests.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(LucideIcons.calendarX2, size: 56, color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                          const SizedBox(height: 12),
                          Text('No absence requests filed yet', style: TextStyle(color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted)),
                        ],
                      ),
                    );
                  }

                  return ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: requests.length,
                    separatorBuilder: (c, i) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final req = requests[index];
                      SlBadgeVariant variant;
                      switch (req.status.toUpperCase()) {
                        case 'APPROVED':
                          variant = SlBadgeVariant.success;
                          break;
                        case 'REJECTED':
                          variant = SlBadgeVariant.danger;
                          break;
                        default:
                          variant = SlBadgeVariant.warning;
                      }

                      return SlCard(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(req.studentName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                                SlBadge(text: req.status, variant: variant),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Icon(LucideIcons.calendar, size: 14, color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                                const SizedBox(width: 6),
                                Text(
                                  '${DateFormat('MMM d').format(req.startDate)} - ${DateFormat('MMM d, yyyy').format(req.endDate)}',
                                  style: TextStyle(color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted, fontSize: 12, fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(req.reason, style: TextStyle(color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary, fontSize: 13)),
                            if (req.reviewNotes != null && req.reviewNotes!.isNotEmpty) ...[
                              const SizedBox(height: 8),
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withAlpha(15),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text('School Note: ${req.reviewNotes}', style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic)),
                              ),
                            ],
                          ],
                        ),
                      );
                    },
                  );
                },
              ),
            );
          },
        );
      },
    );
  }
}
