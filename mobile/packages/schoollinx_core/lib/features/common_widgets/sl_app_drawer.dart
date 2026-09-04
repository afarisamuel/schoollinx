import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_colors.dart';
import '../auth/presentation/bloc/auth_bloc.dart';
import '../auth/presentation/bloc/auth_event.dart';
import '../auth/presentation/bloc/auth_state.dart';
import 'sl_avatar.dart';
import 'sl_badge.dart';

class SlDrawerItemData {
  final IconData icon;
  final String title;
  final String route;
  final String? badgeText;
  final SlBadgeVariant badgeVariant;
  final VoidCallback? customAction;

  const SlDrawerItemData({
    required this.icon,
    required this.title,
    required this.route,
    this.badgeText,
    this.badgeVariant = SlBadgeVariant.primary,
    this.customAction,
  });
}

class SlDrawerGroupData {
  final String id;
  final String title;
  final Color accentColor;
  final String? hubRoute;
  final List<SlDrawerItemData> items;

  const SlDrawerGroupData({
    required this.id,
    required this.title,
    this.accentColor = AppColors.primary,
    this.hubRoute,
    required this.items,
  });
}

class SlAppDrawer extends StatefulWidget {
  final String appTitle;
  final String roleBadgeText;
  final SlBadgeVariant roleBadgeVariant;
  final List<SlDrawerGroupData>? groups;
  final List<SlDrawerItemData>? items;
  final String? currentRoute;
  final void Function(String route)? onNavigate;
  final VoidCallback? onLogout;

  const SlAppDrawer({
    super.key,
    required this.appTitle,
    required this.roleBadgeText,
    this.roleBadgeVariant = SlBadgeVariant.primary,
    this.groups,
    this.items,
    this.currentRoute,
    this.onNavigate,
    this.onLogout,
  });

  @override
  State<SlAppDrawer> createState() => _SlAppDrawerState();
}

class _SlAppDrawerState extends State<SlAppDrawer> with SingleTickerProviderStateMixin {
  final TextEditingController _searchController = TextEditingController();
  final Map<String, bool> _expandedGroups = {};
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    final allGroups = _getAllGroups();
    for (final group in allGroups) {
      _expandedGroups[group.id] = true;
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<SlDrawerGroupData> _getAllGroups() {
    if (widget.groups != null && widget.groups!.isNotEmpty) {
      return widget.groups!;
    }
    if (widget.items != null && widget.items!.isNotEmpty) {
      return [
        SlDrawerGroupData(
          id: 'main_overview',
          title: 'OVERVIEW',
          accentColor: AppColors.primary,
          items: widget.items!,
        ),
      ];
    }
    return [];
  }

  List<SlDrawerGroupData> _getFilteredGroups() {
    final allGroups = _getAllGroups();
    if (_searchQuery.isEmpty) return allGroups;

    final query = _searchQuery.toLowerCase();
    final List<SlDrawerGroupData> filtered = [];

    for (final group in allGroups) {
      final matchingItems = group.items.where((item) {
        return item.title.toLowerCase().contains(query) ||
            group.title.toLowerCase().contains(query);
      }).toList();

      if (matchingItems.isNotEmpty) {
        filtered.add(
          SlDrawerGroupData(
            id: group.id,
            title: group.title,
            accentColor: group.accentColor,
            hubRoute: group.hubRoute,
            items: matchingItems,
          ),
        );
      }
    }

    return filtered;
  }

  bool _isRouteActive(String route) {
    if (widget.currentRoute == null || widget.currentRoute!.isEmpty) return false;
    if (widget.currentRoute == route) return true;
    if (route != '/' && widget.currentRoute!.startsWith('$route/')) return true;
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final filteredGroups = _getFilteredGroups();

    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        final user = state.user;
        final tenant = state.tenant;

        return Drawer(
          backgroundColor: isDark ? const Color(0xFF0B1120) : const Color(0xFFF8FAFC),
          elevation: 16,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.only(
              topRight: Radius.circular(24),
              bottomRight: Radius.circular(24),
            ),
          ),
          child: SafeArea(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // ── 1. BRAND & TENANT HEADER ─────────────────────────────
                Container(
                  padding: const EdgeInsets.fromLTRB(18, 16, 16, 16),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF0D1526) : Colors.white,
                    border: Border(
                      bottom: BorderSide(
                        color: isDark ? Colors.white.withAlpha(20) : const Color(0xFFE2E8F0),
                        width: 1,
                      ),
                    ),
                  ),
                  child: Row(
                    children: [
                      // School / App Brand Icon Box
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF1E293B) : const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isDark ? Colors.white.withAlpha(25) : AppColors.primary.withAlpha(40),
                            width: 1.2,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withAlpha(isDark ? 30 : 20),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Center(
                          child: Icon(
                            LucideIcons.school,
                            size: 22,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Tenant Name & Status Dot
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              tenant?.name ?? 'SchoolLinx OS',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w900,
                                letterSpacing: -0.3,
                                color: isDark ? Colors.white : const Color(0xFF0F172A),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 3),
                            Row(
                              children: [
                                Container(
                                  width: 7,
                                  height: 7,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF10B981),
                                    shape: BoxShape.circle,
                                    boxShadow: [
                                      BoxShadow(
                                        color: const Color(0xFF10B981).withAlpha(120),
                                        blurRadius: 6,
                                        spreadRadius: 1,
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 6),
                                const Text(
                                  'OS ACTIVE',
                                  style: TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 0.8,
                                    color: Color(0xFF10B981),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      // Close Drawer Button
                      Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: () => Navigator.of(context).pop(),
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: isDark ? Colors.white.withAlpha(15) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(
                              LucideIcons.x,
                              size: 16,
                              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // ── 2. QUICK MODULE SEARCH BAR ───────────────────────────
                Padding(
                  padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
                  child: Container(
                    height: 40,
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF111C32) : Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isDark ? Colors.white.withAlpha(25) : const Color(0xFFCBD5E1),
                        width: 1,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withAlpha(isDark ? 20 : 8),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: TextField(
                      controller: _searchController,
                      onChanged: (val) {
                        setState(() {
                          _searchQuery = val.trim();
                        });
                      },
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                      ),
                      decoration: InputDecoration(
                        isDense: true,
                        hintText: 'Quick find module...',
                        hintStyle: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                        ),
                        prefixIcon: Icon(
                          LucideIcons.search,
                          size: 15,
                          color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                        ),
                        prefixIconConstraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                        suffixIcon: _searchQuery.isNotEmpty
                            ? IconButton(
                                icon: const Icon(LucideIcons.x, size: 14),
                                padding: EdgeInsets.zero,
                                onPressed: () {
                                  _searchController.clear();
                                  setState(() {
                                    _searchQuery = '';
                                  });
                                },
                              )
                            : Container(
                                margin: const EdgeInsets.only(right: 8),
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: isDark ? Colors.white.withAlpha(15) : const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  '/',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontFamily: 'monospace',
                                    fontWeight: FontWeight.w700,
                                    color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                  ),
                                ),
                              ),
                        suffixIconConstraints: const BoxConstraints(minWidth: 32, minHeight: 28),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(vertical: 11),
                      ),
                    ),
                  ),
                ),

                // ── 3. SCROLLABLE CATEGORIZED NAVIGATION ─────────────────
                Expanded(
                  child: filteredGroups.isEmpty
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  LucideIcons.searchX,
                                  size: 32,
                                  color: isDark ? const Color(0xFF475569) : const Color(0xFF94A3B8),
                                ),
                                const SizedBox(height: 10),
                                Text(
                                  'No matching modules found',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                TextButton(
                                  onPressed: () {
                                    _searchController.clear();
                                    setState(() {
                                      _searchQuery = '';
                                    });
                                  },
                                  child: const Text(
                                    'CLEAR FILTER',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                      : ListView.builder(
                          physics: const BouncingScrollPhysics(),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          itemCount: filteredGroups.length,
                          itemBuilder: (context, groupIndex) {
                            final group = filteredGroups[groupIndex];
                            final isExpanded = _searchQuery.isNotEmpty
                                ? true
                                : (_expandedGroups[group.id] ?? true);

                            return Container(
                              margin: const EdgeInsets.only(bottom: 6),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  // ── Category Section Header
                                  InkWell(
                                    onTap: () {
                                      setState(() {
                                        _expandedGroups[group.id] = !isExpanded;
                                      });
                                    },
                                    borderRadius: BorderRadius.circular(10),
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                                      child: Row(
                                        children: [
                                          // Group Accent Dot with subtle glow
                                          Container(
                                            width: 7,
                                            height: 7,
                                            decoration: BoxDecoration(
                                              color: group.accentColor,
                                              shape: BoxShape.circle,
                                              boxShadow: [
                                                BoxShadow(
                                                  color: group.accentColor.withAlpha(100),
                                                  blurRadius: 4,
                                                ),
                                              ],
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text(
                                              group.title,
                                              style: TextStyle(
                                                fontSize: 10.5,
                                                fontWeight: FontWeight.w900,
                                                letterSpacing: 0.9,
                                                color: isDark
                                                    ? const Color(0xFF94A3B8)
                                                    : const Color(0xFF64748B),
                                              ),
                                            ),
                                          ),
                                          // Hub shortcut if present
                                          if (group.hubRoute != null) ...[
                                            InkWell(
                                              onTap: () {
                                                Navigator.of(context).pop();
                                                if (widget.onNavigate != null) {
                                                  widget.onNavigate!(group.hubRoute!);
                                                }
                                              },
                                              borderRadius: BorderRadius.circular(6),
                                              child: Padding(
                                                padding: const EdgeInsets.all(4),
                                                child: Icon(
                                                  LucideIcons.externalLink,
                                                  size: 13,
                                                  color: isDark
                                                      ? const Color(0xFF64748B)
                                                      : const Color(0xFF94A3B8),
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 2),
                                          ],
                                          // Animated Chevron
                                          AnimatedRotation(
                                            turns: isExpanded ? 0.25 : 0.0,
                                            duration: const Duration(milliseconds: 200),
                                            child: Icon(
                                              LucideIcons.chevronRight,
                                              size: 14,
                                              color: isDark
                                                  ? const Color(0xFF64748B)
                                                  : const Color(0xFF94A3B8),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),

                                  // ── Items inside category
                                  if (isExpanded)
                                    ...group.items.map((item) {
                                      final isSelected = _isRouteActive(item.route);

                                      return Container(
                                        margin: const EdgeInsets.only(bottom: 2),
                                        child: Material(
                                          color: Colors.transparent,
                                          child: InkWell(
                                            onTap: () {
                                              Navigator.of(context).pop();
                                              if (item.customAction != null) {
                                                item.customAction!();
                                              } else if (widget.onNavigate != null &&
                                                  item.route.isNotEmpty) {
                                                widget.onNavigate!(item.route);
                                              }
                                            },
                                            borderRadius: BorderRadius.circular(12),
                                            child: AnimatedContainer(
                                              duration: const Duration(milliseconds: 150),
                                              padding: const EdgeInsets.symmetric(
                                                horizontal: 10,
                                                vertical: 8,
                                              ),
                                              decoration: BoxDecoration(
                                                color: isSelected
                                                    ? AppColors.primary.withAlpha(isDark ? 55 : 30)
                                                    : Colors.transparent,
                                                borderRadius: BorderRadius.circular(12),
                                                border: Border.all(
                                                  color: isSelected
                                                      ? AppColors.primary.withAlpha(isDark ? 110 : 80)
                                                      : Colors.transparent,
                                                  width: 1,
                                                ),
                                              ),
                                              child: Row(
                                                children: [
                                                  // Left active bar indicator
                                                  if (isSelected)
                                                    Container(
                                                      width: 3.5,
                                                      height: 20,
                                                      margin: const EdgeInsets.only(right: 8),
                                                      decoration: BoxDecoration(
                                                        color: const Color(0xFF38BDF8),
                                                        borderRadius: BorderRadius.circular(3),
                                                        boxShadow: [
                                                          BoxShadow(
                                                            color: const Color(0xFF38BDF8).withAlpha(160),
                                                            blurRadius: 6,
                                                          ),
                                                        ],
                                                      ),
                                                    ),

                                                  // Icon Badge Box (matching frontend structured 32x32 icon box)
                                                  Container(
                                                    width: 30,
                                                    height: 30,
                                                    decoration: BoxDecoration(
                                                      gradient: isSelected
                                                          ? const LinearGradient(
                                                              begin: Alignment.topLeft,
                                                              end: Alignment.bottomRight,
                                                              colors: [
                                                                Color(0xFF2563EB),
                                                                Color(0xFF1D4ED8),
                                                              ],
                                                            )
                                                          : null,
                                                      color: isSelected
                                                          ? null
                                                          : (isDark
                                                              ? Colors.white.withAlpha(15)
                                                              : const Color(0xFFF1F5F9)),
                                                      borderRadius: BorderRadius.circular(9),
                                                      boxShadow: isSelected
                                                          ? [
                                                              BoxShadow(
                                                                color: const Color(0xFF2563EB).withAlpha(90),
                                                                blurRadius: 8,
                                                                offset: const Offset(0, 2),
                                                              ),
                                                            ]
                                                          : null,
                                                    ),
                                                    child: Center(
                                                      child: Icon(
                                                        item.icon,
                                                        size: 15,
                                                        color: isSelected
                                                            ? Colors.white
                                                            : (isDark
                                                                ? const Color(0xFFCBD5E1)
                                                                : const Color(0xFF475569)),
                                                      ),
                                                    ),
                                                  ),
                                                  const SizedBox(width: 10),

                                                  // Item Label
                                                  Expanded(
                                                    child: Text(
                                                      item.title,
                                                      style: TextStyle(
                                                        fontSize: 12.5,
                                                        fontWeight: isSelected
                                                            ? FontWeight.w800
                                                            : FontWeight.w600,
                                                        color: isSelected
                                                            ? (isDark ? Colors.white : const Color(0xFF1D4ED8))
                                                            : (isDark
                                                                ? const Color(0xFFE2E8F0)
                                                                : const Color(0xFF1E293B)),
                                                      ),
                                                      maxLines: 1,
                                                      overflow: TextOverflow.ellipsis,
                                                    ),
                                                  ),

                                                  // Badge Text if present
                                                  if (item.badgeText != null) ...[
                                                    const SizedBox(width: 6),
                                                    SlBadge(
                                                      text: item.badgeText!,
                                                      variant: item.badgeVariant,
                                                    ),
                                                  ],
                                                ],
                                              ),
                                            ),
                                          ),
                                        ),
                                      );
                                    }),
                                ],
                              ),
                            );
                          },
                        ),
                ),

                // ── 4. BOTTOM USER CARD & SIGN OUT ───────────────────────
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF0D1526) : Colors.white,
                    border: Border(
                      top: BorderSide(
                        color: isDark ? Colors.white.withAlpha(20) : const Color(0xFFE2E8F0),
                        width: 1,
                      ),
                    ),
                  ),
                  child: Column(
                    children: [
                      // User Identity Tile
                      Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: () {
                            Navigator.of(context).pop();
                            if (widget.onNavigate != null) {
                              widget.onNavigate!('/profile');
                            }
                          },
                          borderRadius: BorderRadius.circular(14),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            decoration: BoxDecoration(
                              color: isDark ? Colors.white.withAlpha(10) : const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: isDark ? Colors.white.withAlpha(15) : const Color(0xFFE2E8F0),
                              ),
                            ),
                            child: Row(
                              children: [
                                SlAvatar(
                                  initials: user?.initials ?? 'U',
                                  imageUrl: user?.avatarUrl,
                                  size: 38,
                                  backgroundColor: AppColors.primary,
                                  textColor: Colors.white,
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        user?.fullName.isNotEmpty == true
                                            ? user!.fullName
                                            : 'SchoolLinx User',
                                        style: TextStyle(
                                          fontSize: 12.5,
                                          fontWeight: FontWeight.w800,
                                          color: isDark ? Colors.white : const Color(0xFF0F172A),
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 3),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                        decoration: BoxDecoration(
                                          color: isDark
                                              ? const Color(0xFF1E1B4B).withAlpha(180)
                                              : const Color(0xFFEFF6FF),
                                          borderRadius: BorderRadius.circular(6),
                                          border: Border.all(
                                            color: isDark
                                                ? const Color(0xFF3730A3).withAlpha(160)
                                                : const Color(0xFFBFDBFE),
                                          ),
                                        ),
                                        child: Text(
                                          widget.roleBadgeText,
                                          style: TextStyle(
                                            fontSize: 9,
                                            fontWeight: FontWeight.w900,
                                            letterSpacing: 0.5,
                                            color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Icon(
                                  LucideIcons.chevronRight,
                                  size: 14,
                                  color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),

                      // Sign Out Button
                      Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: () => _confirmLogout(context),
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(vertical: 9),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? const Color(0xFF4C0519).withAlpha(80)
                                  : const Color(0xFFFFF1F2),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isDark
                                    ? const Color(0xFFE11D48).withAlpha(80)
                                    : const Color(0xFFFECDD3),
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  LucideIcons.logOut,
                                  size: 14,
                                  color: isDark ? const Color(0xFFFDA4AF) : const Color(0xFFE11D48),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Sign Out',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800,
                                    color: isDark ? const Color(0xFFFDA4AF) : const Color(0xFFE11D48),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),

                      Text(
                        '${widget.appTitle} • v1.0.0',
                        style: TextStyle(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w600,
                          color: isDark ? const Color(0xFF475569) : const Color(0xFF94A3B8),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _confirmLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out of this account?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            style: TextButton.styleFrom(
              foregroundColor: const Color(0xFFE11D48),
              textStyle: const TextStyle(fontWeight: FontWeight.w800),
            ),
            onPressed: () {
              Navigator.of(dialogCtx).pop();
              Navigator.of(context).pop(); // Close drawer
              if (widget.onLogout != null) {
                widget.onLogout!();
              } else {
                context.read<AuthBloc>().add(const LogoutRequestedEvent());
              }
            },
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }
}
