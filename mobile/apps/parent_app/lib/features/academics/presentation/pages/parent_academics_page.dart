import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

class ParentAcademicsPage extends StatelessWidget {
  const ParentAcademicsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<GuardianBloc>()..add(LoadGuardianChildrenEvent()),
      child: const _ParentAcademicsView(),
    );
  }
}

class _ParentAcademicsView extends StatelessWidget {
  const _ParentAcademicsView();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Terminal Report Card', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, size: 18),
            onPressed: () {
              context.read<GuardianBloc>().add(LoadGuardianChildrenEvent());
            },
          ),
        ],
      ),
      body: SafeArea(
        child: BlocBuilder<GuardianBloc, GuardianState>(
          builder: (context, state) {
            if (state is GuardianLoading) {
              return const Center(child: CircularProgressIndicator());
            }

            if (state is GuardianError) {
              return Center(child: Text('Error: ${state.message}'));
            }

            final children = state is GuardianChildrenLoaded ? state.children : <ChildEntity>[];
            final selectedChild = state is GuardianChildrenLoaded ? state.selectedChild : null;
            final academics = state is GuardianChildrenLoaded ? (state.academicDetails ?? {}) : <String, dynamic>{};

            if (children.isEmpty) {
              return const Center(child: Text('No student profiles found'));
            }

            final activeChild = selectedChild ?? children.first;
            final subjects = (academics['subjects'] as List?) ?? [];
            final gpa = academics['overall_gpa'] ?? '3.85 / 4.0';
            final rank = academics['rank'] ?? '2nd / 34';
            final remarks = academics['remarks'] ?? 'Consistent academic focus and discipline.';

            return SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Child switch tabs if multiple children
                  if (children.length > 1)
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: children.map((c) {
                          final isSelected = c.id == activeChild.id;
                          return Padding(
                            padding: const EdgeInsets.only(right: 8, bottom: 12),
                            child: ChoiceChip(
                              label: Text(c.fullName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                              selected: isSelected,
                              onSelected: (_) {
                                context.read<GuardianBloc>().add(SelectChildEvent(c));
                              },
                            ),
                          );
                        }).toList(),
                      ),
                    ),

                  // Summary Header
                  SlCard(
                    hasGradient: true,
                    padding: const EdgeInsets.all(18),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('STUDENT PERFORMANCE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.darkTextMuted)),
                            const SizedBox(height: 4),
                            Text(activeChild.fullName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
                            Text('${activeChild.className} • Position: $rank', style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary)),
                          ],
                        ),
                        SlBadge(text: 'GPA: $gpa', variant: SlBadgeVariant.success),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  const Text(
                    'SUBJECT BREAKDOWN & REMARKS',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.2, color: AppColors.darkTextMuted),
                  ),
                  const SizedBox(height: 12),

                  if (subjects.isEmpty)
                    const SlCard(
                      child: Padding(
                        padding: EdgeInsets.all(16.0),
                        child: Center(child: Text('No subject grades published yet.')),
                      ),
                    )
                  else
                    ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: subjects.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final sub = subjects[index] as Map<String, dynamic>;

                        return SlCard(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(sub['name'] ?? 'Subject', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                                  Text('${sub['score']}% • ${sub['grade']}', style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.emeraldLight)),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Tutor: ${sub['teacher'] ?? "Class Instructor"}',
                                style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                              ),
                            ],
                          ),
                        );
                      },
                    ),

                  const SizedBox(height: 16),

                  SlCard(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('HEAD TEACHER REMARKS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.darkTextMuted)),
                        const SizedBox(height: 6),
                        Text(
                          '"$remarks"',
                          style: const TextStyle(fontSize: 13, fontStyle: FontStyle.italic, fontWeight: FontWeight.w600),
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
      bottomNavigationBar: const _ParentAcademicsBottomNav(),
    );
  }
}

class _ParentAcademicsBottomNav extends StatelessWidget {
  const _ParentAcademicsBottomNav();

  @override
  Widget build(BuildContext context) {
    return NavigationBar(
      selectedIndex: 2,
      onDestinationSelected: (index) {
        switch (index) {
          case 0:
            context.go('/dashboard');
            break;
          case 1:
            context.go('/fees');
            break;
          case 2:
            context.go('/academics');
            break;
          case 3:
            context.go('/bus');
            break;
          case 4:
            context.go('/profile');
            break;
        }
      },
      destinations: const [
        NavigationDestination(icon: Icon(LucideIcons.home), label: 'Home'),
        NavigationDestination(icon: Icon(LucideIcons.creditCard), label: 'Fees'),
        NavigationDestination(icon: Icon(LucideIcons.graduationCap), label: 'Academics'),
        NavigationDestination(icon: Icon(LucideIcons.bus), label: 'Transit'),
        NavigationDestination(icon: Icon(LucideIcons.user), label: 'Profile'),
      ],
    );
  }
}
