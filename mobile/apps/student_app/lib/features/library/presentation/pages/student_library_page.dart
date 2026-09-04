import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

class StudentLibraryPage extends StatelessWidget {
  const StudentLibraryPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<LibraryBloc>()..add(LoadLibraryBooksEvent()),
      child: const _StudentLibraryView(),
    );
  }
}

class _StudentLibraryView extends StatefulWidget {
  const _StudentLibraryView();

  @override
  State<_StudentLibraryView> createState() => _StudentLibraryViewState();
}

class _StudentLibraryViewState extends State<_StudentLibraryView> {
  final _searchController = TextEditingController();
  String _selectedCategory = 'ALL';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final categories = ['ALL', 'SCIENCE', 'MATHEMATICS', 'LITERATURE', 'HISTORY', 'TECHNOLOGY'];

    return BlocConsumer<LibraryBloc, LibraryState>(
      listener: (context, state) {
        if (state is BookReservedSuccessState) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Reservation hold placed for "${state.bookTitle}"! Collect at campus library desk.'),
              backgroundColor: AppColors.emerald,
            ),
          );
        } else if (state is LibraryError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: AppColors.rose),
          );
        }
      },
      builder: (context, state) {
        return Scaffold(
          appBar: AppBar(
            title: const Text('Digital Library & Catalogue', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
            actions: [
              IconButton(
                icon: const Icon(LucideIcons.rotateCw, size: 20),
                onPressed: () {
                  context.read<LibraryBloc>().add(LoadLibraryBooksEvent());
                },
              ),
            ],
          ),
          body: Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: SlInput(
                  hintText: 'Search by title, author, or ISBN...',
                  controller: _searchController,
                  prefixIcon: const Icon(LucideIcons.search, size: 18),
                  onChanged: (val) {
                    context.read<LibraryBloc>().add(
                          SearchLibraryBooksEvent(
                            query: val,
                            category: _selectedCategory,
                          ),
                        );
                  },
                ),
              ),
              Container(
                height: 44,
                margin: const EdgeInsets.symmetric(vertical: 6),
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: categories.length,
                  separatorBuilder: (c, i) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final cat = categories[index];
                    final isSelected = cat == _selectedCategory;
                    return ChoiceChip(
                      label: Text(cat == 'ALL' ? 'All' : cat[0] + cat.substring(1).toLowerCase()),
                      selected: isSelected,
                      onSelected: (selected) {
                        if (selected) {
                          setState(() => _selectedCategory = cat);
                          context.read<LibraryBloc>().add(
                                SearchLibraryBooksEvent(
                                  query: _searchController.text.trim(),
                                  category: cat,
                                ),
                              );
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
                    if (state is LibraryLoading) {
                      return const Center(child: CircularProgressIndicator());
                    }

                    if (state is LibraryError) {
                      return Center(child: Text(state.message, style: const TextStyle(color: AppColors.rose)));
                    }

                    final books = state is LibraryBooksLoaded ? state.filteredBooks : <LibraryBookEntity>[];

                    if (books.isEmpty) {
                      return Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(LucideIcons.bookMarked, size: 56, color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                            const SizedBox(height: 12),
                            Text('No library books found matching criteria', style: TextStyle(color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted)),
                          ],
                        ),
                      );
                    }

                    return ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: books.length,
                      separatorBuilder: (c, i) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final book = books[index];
                        return SlCard(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              Container(
                                width: 48,
                                height: 64,
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withAlpha(25),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: AppColors.primary.withAlpha(50)),
                                ),
                                child: const Center(
                                  child: Icon(LucideIcons.book, color: AppColors.primary, size: 24),
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(book.title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                                    const SizedBox(height: 2),
                                    Text(
                                      book.author,
                                      style: TextStyle(
                                        color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                                        fontSize: 12,
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    Row(
                                      children: [
                                        SlBadge(text: book.category, variant: SlBadgeVariant.neutral),
                                        const SizedBox(width: 8),
                                        SlBadge(
                                          text: book.isAvailable ? '${book.copiesAvailable} Available' : 'Borrowed',
                                          variant: book.isAvailable ? SlBadgeVariant.success : SlBadgeVariant.warning,
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              if (book.isAvailable)
                                IconButton(
                                  icon: const Icon(LucideIcons.bookmarkPlus, color: AppColors.primaryLight, size: 20),
                                  tooltip: 'Reserve Book Hold',
                                  onPressed: () {
                                    context.read<LibraryBloc>().add(ReserveBookEvent(book.id));
                                  },
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
