import 'package:flutter/material.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import '../../../../core/widgets/teacher_drawer.dart';

class TeacherAiCopilotPage extends StatefulWidget {
  const TeacherAiCopilotPage({super.key});

  @override
  State<TeacherAiCopilotPage> createState() => _TeacherAiCopilotPageState();
}

class _TeacherAiCopilotPageState extends State<TeacherAiCopilotPage> {
  final _promptController = TextEditingController();
  String? _generatedResponse;
  bool _isGenerating = false;

  @override
  void dispose() {
    _promptController.dispose();
    super.dispose();
  }

  void _generateContent() {
    if (_promptController.text.trim().isEmpty) return;
    setState(() => _isGenerating = true);
    Future.delayed(const Duration(milliseconds: 900), () {
      if (!mounted) return;
      setState(() {
        _isGenerating = false;
        _generatedResponse = '''
### 📚 Generated 45-Min Lesson Plan
**Subject**: Core Mathematics  
**Topic**: Quadratic Factorization  
**Grade Level**: JHS 3  

#### 🎯 Key Learning Objectives
1. Identify standard quadratic trinomials in the form ax² + bx + c = 0.
2. Find two integer factors whose product equals c and sum equals b.
3. Solve 5 practice equations on student slate boards.

#### ⏱️ Lesson Structure:
- **00 - 10 Mins (Hook & Review)**: Quick oral drill on integer multiplication tables.
- **10 - 25 Mins (Explicit Instruction)**: Demonstration of the "box method" on chalkboard.
- **25 - 40 Mins (Guided Group Work)**: 3 real-world area problems solved in pairs.
- **40 - 45 Mins (Exit Ticket)**: Formative question: Factorize x² + 7x + 12.
''';
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      drawer: const TeacherDrawer(currentRoute: '/ai-copilot'),
      appBar: AppBar(
        title: Text(
          'AI Teaching Copilot',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: isDark ? Colors.white : const Color(0xFF0F172A),
          ),
        ),
        backgroundColor: isDark ? const Color(0xFF0D1526) : Colors.white,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SlCard(
            padding: const EdgeInsets.all(16),
            borderRadius: BorderRadius.circular(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
                    ),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(LucideIcons.sparkles, size: 28, color: Colors.white),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Classroom AI Assistant',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: isDark ? Colors.white : const Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Generate WAEC/BECE aligned lesson plans, quiz questions, and marking rubrics.',
                        style: TextStyle(
                          fontSize: 11.5,
                          color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          SlCard(
            padding: const EdgeInsets.all(16),
            borderRadius: BorderRadius.circular(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'WHAT WOULD YOU LIKE TO CREATE TODAY?',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.1,
                    color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _promptController,
                  maxLines: 3,
                  style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 13),
                  decoration: InputDecoration(
                    hintText: 'e.g. Create a 45-min lesson plan on Quadratic Factorization for JHS 3 with 3 homework questions...',
                    hintStyle: TextStyle(color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8), fontSize: 12),
                    filled: true,
                    fillColor: isDark ? Colors.white.withAlpha(10) : const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6366F1),
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 44),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: _isGenerating
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(LucideIcons.bot, size: 18),
                  label: Text(
                    _isGenerating ? 'Synthesizing Curriculum Plan...' : 'Generate with SchoolLinx AI',
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                  ),
                  onPressed: _isGenerating ? null : _generateContent,
                ),
              ],
            ),
          ),

          if (_generatedResponse != null) ...[
            const SizedBox(height: 20),
            SlCard(
              padding: const EdgeInsets.all(16),
              borderRadius: BorderRadius.circular(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const SlBadge(text: 'AI GENERATED OUTPUT', variant: SlBadgeVariant.primary),
                      IconButton(
                        icon: const Icon(LucideIcons.copy, size: 16),
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Copied lesson plan to clipboard!')),
                          );
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    _generatedResponse!,
                    style: TextStyle(
                      fontSize: 12.5,
                      height: 1.5,
                      color: isDark ? const Color(0xFFE2E8F0) : const Color(0xFF1E293B),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
