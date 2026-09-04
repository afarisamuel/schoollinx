import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_colors.dart';
import '../common_widgets/sl_card.dart';
import '../common_widgets/sl_badge.dart';

class CloudResourcesPage extends StatefulWidget {
  final Widget? drawer;
  const CloudResourcesPage({super.key, this.drawer});

  @override
  State<CloudResourcesPage> createState() => _CloudResourcesPageState();
}

class _CloudResourcesPageState extends State<CloudResourcesPage> {
  final List<Map<String, dynamic>> _folders = [
    {'name': 'Mathematics Past Papers', 'count': '24 files', 'color': Color(0xFF3B82F6), 'icon': LucideIcons.folder},
    {'name': 'Science Lab Guides', 'count': '18 files', 'color': Color(0xFF10B981), 'icon': LucideIcons.flaskConical},
    {'name': 'WAEC / BECE Syllabus', 'count': '12 files', 'color': Color(0xFFF59E0B), 'icon': LucideIcons.fileText},
    {'name': 'Recorded Video Masterclasses', 'count': '42 videos', 'color': Color(0xFF8B5CF6), 'icon': LucideIcons.video},
  ];

  final List<Map<String, dynamic>> _recentFiles = [
    {
      'name': '2024_WASSCE_CoreMath_Mock_Solutions.pdf',
      'size': '4.2 MB',
      'updated': '2 hours ago',
      'type': 'PDF Document',
      'icon': LucideIcons.fileText,
      'iconColor': Color(0xFFEF4444),
    },
    {
      'name': 'Physics_Mechanics_Form2_Slides.pptx',
      'size': '15.8 MB',
      'updated': 'Yesterday',
      'type': 'Presentation',
      'icon': LucideIcons.presentation,
      'iconColor': Color(0xFFF59E0B),
    },
    {
      'name': 'Chemistry_Titration_Practical_Demo.mp4',
      'size': '142 MB',
      'updated': 'Aug 29',
      'type': 'HD Video',
      'icon': LucideIcons.video,
      'iconColor': Color(0xFF8B5CF6),
    },
    {
      'name': 'English_Language_Oral_Phonetics.mp3',
      'size': '8.5 MB',
      'updated': 'Aug 26',
      'type': 'Audio Lesson',
      'icon': LucideIcons.headphones,
      'iconColor': Color(0xFF10B981),
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: widget.drawer,
      appBar: AppBar(
        title: Text(
          'Cloud Learning Resources',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: isDark ? Colors.white : const Color(0xFF0F172A),
          ),
        ),
        backgroundColor: isDark ? const Color(0xFF0D1526) : Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(LucideIcons.cloudUpload, size: 20, color: isDark ? Colors.white : const Color(0xFF0F172A)),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('File upload modal opened')),
              );
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Storage quota banner
          SlCard(
            padding: const EdgeInsets.all(16),
            borderRadius: BorderRadius.circular(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(LucideIcons.cloud, size: 20, color: AppColors.primary),
                        const SizedBox(width: 8),
                        Text(
                          'Institutional Cloud Drive',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: isDark ? Colors.white : const Color(0xFF0F172A),
                          ),
                        ),
                      ],
                    ),
                    const SlBadge(text: 'SECURE CLOUD', variant: SlBadgeVariant.success),
                  ],
                ),
                const SizedBox(height: 12),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: 0.38,
                    minHeight: 8,
                    backgroundColor: isDark ? Colors.white.withAlpha(20) : const Color(0xFFE2E8F0),
                    valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '38.4 GB used of 100 GB Cloud Storage (Encrypted AWS S3)',
                  style: TextStyle(
                    fontSize: 11.5,
                    color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          Text(
            'FEATURED SUBJECT DRIVES',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.1,
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 12),

          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.4,
            ),
            itemCount: _folders.length,
            itemBuilder: (context, index) {
              final folder = _folders[index];
              final color = folder['color'] as Color;

              return SlCard(
                padding: const EdgeInsets.all(12),
                borderRadius: BorderRadius.circular(14),
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Opening drive: ${folder['name']}')),
                  );
                },
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: color.withAlpha(isDark ? 50 : 30),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(folder['icon'] as IconData, size: 20, color: color),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          folder['name'],
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w800,
                            color: isDark ? Colors.white : const Color(0xFF0F172A),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          folder['count'],
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 24),

          Text(
            'RECENT LEARNING ATTACHMENTS',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.1,
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 12),

          ..._recentFiles.map((file) {
            final color = file['iconColor'] as Color;

            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: SlCard(
                padding: const EdgeInsets.all(12),
                borderRadius: BorderRadius.circular(14),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: color.withAlpha(isDark ? 50 : 30),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Center(
                        child: Icon(file['icon'] as IconData, size: 20, color: color),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            file['name'],
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${file['type']} • ${file['size']} • ${file['updated']}',
                            style: TextStyle(
                              fontSize: 11,
                              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(LucideIcons.download, size: 18, color: AppColors.primary),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Downloading ${file['name']}...')),
                        );
                      },
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}
