import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_colors.dart';
import '../common_widgets/sl_card.dart';
import '../common_widgets/sl_badge.dart';

class DigitalLibraryPage extends StatefulWidget {
  final Widget? drawer;
  const DigitalLibraryPage({super.key, this.drawer});

  @override
  State<DigitalLibraryPage> createState() => _DigitalLibraryPageState();
}

class _DigitalLibraryPageState extends State<DigitalLibraryPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  final List<Map<String, dynamic>> _books = [
    {
      'title': 'Core Mathematics for Senior High Schools',
      'author': 'Prof. J. K. Adjei',
      'category': 'Mathematics',
      'isbn': '978-0-19-838912-1',
      'available': 14,
      'isDigital': true,
      'fileSize': '12.4 MB',
      'color': const Color(0xFF3B82F6),
      'pages': 412,
    },
    {
      'title': 'Integrated Science & Laboratory Manual',
      'author': 'Dr. Cynthia Mensah',
      'category': 'Science',
      'isbn': '978-1-40-584392-0',
      'available': 8,
      'isDigital': true,
      'fileSize': '18.9 MB',
      'color': const Color(0xFF10B981),
      'pages': 328,
    },
    {
      'title': 'African Literature: Anthology of Modern Poetry',
      'author': 'Kwesi Brew & Kofi Awoonor',
      'category': 'Literature',
      'isbn': '978-0-43-590520-2',
      'available': 22,
      'isDigital': true,
      'fileSize': '6.1 MB',
      'color': const Color(0xFF8B5CF6),
      'pages': 196,
    },
    {
      'title': 'Economics: Principles and West African Policy',
      'author': 'E. N. Amuzu',
      'category': 'Business',
      'isbn': '978-0-58-200112-9',
      'available': 5,
      'isDigital': false,
      'color': const Color(0xFFF59E0B),
      'pages': 510,
    },
    {
      'title': 'Computing & Digital Literacy Level 3',
      'author': 'SchoolLinx Tech Publishing',
      'category': 'ICT',
      'isbn': '978-9-98-888991-0',
      'available': 35,
      'isDigital': true,
      'fileSize': '24.0 MB',
      'color': const Color(0xFF06B6D4),
      'pages': 260,
    },
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: widget.drawer,
      appBar: AppBar(
        title: Text(
          'Digital Library & E-Catalog',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: isDark ? Colors.white : const Color(0xFF0F172A),
          ),
        ),
        backgroundColor: isDark ? const Color(0xFF0D1526) : Colors.white,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
          indicatorColor: AppColors.primary,
          indicatorWeight: 3,
          labelStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
          tabs: const [
            Tab(text: 'E-Books & PDFs'),
            Tab(text: 'Physical Catalog'),
            Tab(text: 'My Borrowed Items'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Search & Filter bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: isDark ? const Color(0xFF0D1526) : Colors.white,
            child: TextField(
              controller: _searchController,
              onChanged: (v) => setState(() => _searchQuery = v),
              style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 13),
              decoration: InputDecoration(
                hintText: 'Search title, author, ISBN, or subject...',
                hintStyle: TextStyle(color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8), fontSize: 13),
                prefixIcon: Icon(LucideIcons.search, size: 18, color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8)),
                filled: true,
                fillColor: isDark ? const Color(0xFF1E293B).withAlpha(120) : const Color(0xFFF1F5F9),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildBooksList(isDark, digitalOnly: true),
                _buildBooksList(isDark, digitalOnly: false),
                _buildBorrowedList(isDark),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBooksList(bool isDark, {required bool digitalOnly}) {
    final books = _books.where((b) {
      if (digitalOnly && !(b['isDigital'] as bool)) return false;
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        final title = b['title'].toString().toLowerCase();
        final author = b['author'].toString().toLowerCase();
        final cat = b['category'].toString().toLowerCase();
        return title.contains(query) || author.contains(query) || cat.contains(query);
      }
      return true;
    }).toList();

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: books.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final book = books[index];
        final color = book['color'] as Color;

        return SlCard(
          padding: const EdgeInsets.all(14),
          borderRadius: BorderRadius.circular(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 60,
                height: 80,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [color, color.withAlpha(180)],
                  ),
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [
                    BoxShadow(color: color.withAlpha(70), blurRadius: 8, offset: const Offset(0, 3)),
                  ],
                ),
                child: Center(
                  child: Icon(
                    book['isDigital'] ? LucideIcons.fileText : LucideIcons.book,
                    size: 28,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        SlBadge(text: book['category'], variant: SlBadgeVariant.primary),
                        const Spacer(),
                        if (book['isDigital'])
                          Text(
                            book['fileSize'],
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      book['title'],
                      style: TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w800,
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'By ${book['author']} • ${book['pages']} pp',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w500,
                        color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        if (book['isDigital'])
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              elevation: 0,
                            ),
                            icon: const Icon(LucideIcons.download, size: 14),
                            label: const Text('Read / Download', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Downloading "${book['title']}"...')),
                              );
                            },
                          )
                        else
                          OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: isDark ? Colors.white : const Color(0xFF0F172A),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            icon: const Icon(LucideIcons.bookmarkCheck, size: 14),
                            label: Text('Reserve Copy (${book['available']} left)', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Reserved 1 copy of "${book['title']}"')),
                              );
                            },
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildBorrowedList(bool isDark) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        SlCard(
          padding: const EdgeInsets.all(16),
          borderRadius: BorderRadius.circular(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const SlBadge(text: 'ACTIVE LOAN', variant: SlBadgeVariant.warning),
                  const Spacer(),
                  Text(
                    'Due in 4 Days',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFFF59E0B),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                'Integrated Science & Laboratory Manual',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Barcode ID: SL-LIB-2024-0982 • Issued on Aug 25',
                style: TextStyle(
                  fontSize: 11.5,
                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                ),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: const BorderSide(color: AppColors.primary),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: const Icon(LucideIcons.refreshCw, size: 14),
                label: const Text('Request 7-Day Renewal', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Renewal request submitted to Librarian!')),
                  );
                },
              ),
            ],
          ),
        ),
      ],
    );
  }
}
