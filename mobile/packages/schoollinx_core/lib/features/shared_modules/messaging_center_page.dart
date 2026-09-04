import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_colors.dart';
import '../common_widgets/sl_card.dart';
import '../common_widgets/sl_avatar.dart';

class MessagingCenterPage extends StatefulWidget {
  final String appTitle;
  final Widget? drawer;

  const MessagingCenterPage({
    super.key,
    this.appTitle = 'SchoolLinx Messaging',
    this.drawer,
  });

  @override
  State<MessagingCenterPage> createState() => _MessagingCenterPageState();
}

class _MessagingCenterPageState extends State<MessagingCenterPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  final List<Map<String, dynamic>> _channels = [
    {
      'id': '1',
      'name': 'Staff Room General',
      'type': 'channel',
      'lastMessage': 'Mr. Mensah: Updated the exam timetable for JHS 3.',
      'time': '10:45 AM',
      'unread': 3,
      'isChannel': true,
      'icon': LucideIcons.hash,
      'color': const Color(0xFF6366F1),
    },
    {
      'id': '2',
      'name': 'Science Department',
      'type': 'channel',
      'lastMessage': 'Lab practical sessions scheduled for Wednesday.',
      'time': 'Yesterday',
      'unread': 0,
      'isChannel': true,
      'icon': LucideIcons.flaskConical,
      'color': const Color(0xFF10B981),
    },
    {
      'id': '3',
      'name': 'PTA Executive Committee',
      'type': 'channel',
      'lastMessage': 'Agenda for next Saturday meeting attached.',
      'time': 'Yesterday',
      'unread': 1,
      'isChannel': true,
      'icon': LucideIcons.users,
      'color': const Color(0xFFF59E0B),
    },
    {
      'id': '4',
      'name': 'Dr. Kwame Osei (Head of Academics)',
      'type': 'direct',
      'lastMessage': 'Please send across the lesson notes for review.',
      'time': '09:12 AM',
      'unread': 2,
      'isChannel': false,
      'initials': 'KO',
      'status': 'Online',
    },
    {
      'id': '5',
      'name': 'Mrs. Elizabeth Darko (Parent)',
      'type': 'direct',
      'lastMessage': 'Thank you for the quick feedback regarding Kofi.',
      'time': 'Aug 30',
      'unread': 0,
      'isChannel': false,
      'initials': 'ED',
      'status': 'Offline',
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
          'Messaging Center',
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
            icon: Icon(LucideIcons.penSquare, color: isDark ? Colors.white : const Color(0xFF0F172A), size: 20),
            onPressed: () => _showNewMessageDialog(context, isDark),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
          indicatorColor: AppColors.primary,
          indicatorWeight: 3,
          labelStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
          tabs: const [
            Tab(text: 'All Chats'),
            Tab(text: 'Channels'),
            Tab(text: 'Direct Messages'),
          ],
        ),
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: isDark ? const Color(0xFF0D1526) : Colors.white,
            child: TextField(
              controller: _searchController,
              onChanged: (v) => setState(() => _searchQuery = v),
              style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 13),
              decoration: InputDecoration(
                hintText: 'Search chats, people, channels...',
                hintStyle: TextStyle(color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8), fontSize: 13),
                prefixIcon: Icon(LucideIcons.search, size: 18, color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8)),
                filled: true,
                fillColor: isDark ? const Color(0xFF1E293B).withAlpha(120) : const Color(0xFFF1F5F9),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildChatList(isDark, filter: 'all'),
                _buildChatList(isDark, filter: 'channels'),
                _buildChatList(isDark, filter: 'direct'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChatList(bool isDark, {required String filter}) {
    final items = _channels.where((item) {
      if (filter == 'channels' && !item['isChannel']) return false;
      if (filter == 'direct' && item['isChannel']) return false;
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        final name = item['name'].toString().toLowerCase();
        final msg = item['lastMessage'].toString().toLowerCase();
        return name.contains(query) || msg.contains(query);
      }
      return true;
    }).toList();

    if (items.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(LucideIcons.messageSquareOff, size: 48, color: isDark ? const Color(0xFF475569) : const Color(0xFFCBD5E1)),
            const SizedBox(height: 12),
            Text(
              'No conversations found',
              style: TextStyle(
                fontWeight: FontWeight.w700,
                color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
              ),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: items.length,
      separatorBuilder: (_, _) => const SizedBox(height: 6),
      itemBuilder: (context, index) {
        final item = items[index];
        final isChannel = item['isChannel'] as bool;

        return SlCard(
          padding: const EdgeInsets.all(12),
          borderRadius: BorderRadius.circular(14),
          onTap: () => _openChatDetail(context, item, isDark),
          child: Row(
            children: [
              if (isChannel)
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: (item['color'] as Color).withAlpha(isDark ? 50 : 30),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: (item['color'] as Color).withAlpha(100), width: 1.5),
                  ),
                  child: Center(
                    child: Icon(item['icon'] as IconData, size: 20, color: item['color'] as Color),
                  ),
                )
              else
                Stack(
                  children: [
                    SlAvatar(
                      initials: item['initials'] ?? 'U',
                      size: 44,
                      backgroundColor: const Color(0xFF3B82F6),
                      textColor: Colors.white,
                    ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          color: item['status'] == 'Online' ? const Color(0xFF10B981) : const Color(0xFF94A3B8),
                          shape: BoxShape.circle,
                          border: Border.all(color: isDark ? const Color(0xFF1E293B) : Colors.white, width: 2),
                        ),
                      ),
                    ),
                  ],
                ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            item['name'],
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w800,
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Text(
                          item['time'],
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            item['lastMessage'],
                            style: TextStyle(
                              fontSize: 12,
                              color: (item['unread'] as int) > 0
                                  ? (isDark ? Colors.white : const Color(0xFF1E293B))
                                  : (isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                              fontWeight: (item['unread'] as int) > 0 ? FontWeight.w700 : FontWeight.w500,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if ((item['unread'] as int) > 0) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primary,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '${item['unread']}',
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ],
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

  void _openChatDetail(BuildContext context, Map<String, dynamic> item, bool isDark) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => Scaffold(
          backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
          appBar: AppBar(
            backgroundColor: isDark ? const Color(0xFF0D1526) : Colors.white,
            elevation: 0,
            title: Row(
              children: [
                if (item['isChannel'])
                  Icon(item['icon'] as IconData, size: 18, color: item['color'] as Color)
                else
                  SlAvatar(initials: item['initials'] ?? 'U', size: 30, backgroundColor: const Color(0xFF3B82F6), textColor: Colors.white),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item['name'],
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: isDark ? Colors.white : const Color(0xFF0F172A),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        item['isChannel'] ? 'Encrypted Channel' : (item['status'] ?? 'Active'),
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: item['isChannel'] ? const Color(0xFF10B981) : (item['status'] == 'Online' ? const Color(0xFF10B981) : const Color(0xFF94A3B8)),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          body: Column(
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Center(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: isDark ? Colors.white.withAlpha(15) : const Color(0xFFE2E8F0),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          'Today, 09:00 AM',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    _buildMessageBubble(
                      isDark: isDark,
                      isMe: false,
                      sender: item['name'],
                      message: item['lastMessage'],
                      time: item['time'],
                    ),
                    const SizedBox(height: 12),
                    _buildMessageBubble(
                      isDark: isDark,
                      isMe: true,
                      sender: 'You',
                      message: 'Understood. Reviewing the materials right now and will confirm shortly.',
                      time: '10:48 AM',
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 16),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF0D1526) : Colors.white,
                  border: Border(top: BorderSide(color: isDark ? Colors.white.withAlpha(20) : const Color(0xFFE2E8F0))),
                ),
                child: Row(
                  children: [
                    IconButton(
                      icon: Icon(LucideIcons.paperclip, size: 20, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                      onPressed: () {},
                    ),
                    Expanded(
                      child: TextField(
                        style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 13),
                        decoration: InputDecoration(
                          hintText: 'Type an encrypted message...',
                          hintStyle: TextStyle(color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8), fontSize: 13),
                          filled: true,
                          fillColor: isDark ? const Color(0xFF1E293B).withAlpha(120) : const Color(0xFFF1F5F9),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      decoration: const BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                      child: IconButton(
                        icon: const Icon(LucideIcons.send, size: 18, color: Colors.white),
                        onPressed: () {},
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMessageBubble({
    required bool isDark,
    required bool isMe,
    required String sender,
    required String message,
    required String time,
  }) {
    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 280),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isMe
              ? AppColors.primary
              : (isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0)),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isMe ? 16 : 4),
            bottomRight: Radius.circular(isMe ? 4 : 16),
          ),
        ),
        child: Column(
          crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            if (!isMe)
              Text(
                sender,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8),
                ),
              ),
            const SizedBox(height: 2),
            Text(
              message,
              style: TextStyle(
                fontSize: 13,
                color: isMe ? Colors.white : (isDark ? Colors.white : const Color(0xFF0F172A)),
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              time,
              style: TextStyle(
                fontSize: 9.5,
                color: isMe ? Colors.white.withAlpha(180) : (isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showNewMessageDialog(BuildContext context, bool isDark) {
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? const Color(0xFF0D1526) : Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Start Conversation', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: isDark ? Colors.white : const Color(0xFF0F172A))),
            const SizedBox(height: 16),
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: const Color(0xFF3B82F6).withAlpha(30), borderRadius: BorderRadius.circular(10)),
                child: const Icon(LucideIcons.userPlus, color: Color(0xFF3B82F6), size: 20),
              ),
              title: const Text('Direct Message', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              subtitle: const Text('Chat with a teacher, student, or guardian', style: TextStyle(fontSize: 12)),
              onTap: () => Navigator.of(ctx).pop(),
            ),
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: const Color(0xFF10B981).withAlpha(30), borderRadius: BorderRadius.circular(10)),
                child: const Icon(LucideIcons.hash, color: Color(0xFF10B981), size: 20),
              ),
              title: const Text('Create Channel', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              subtitle: const Text('Create a departmental or study discussion channel', style: TextStyle(fontSize: 12)),
              onTap: () => Navigator.of(ctx).pop(),
            ),
          ],
        ),
      ),
    );
  }
}
