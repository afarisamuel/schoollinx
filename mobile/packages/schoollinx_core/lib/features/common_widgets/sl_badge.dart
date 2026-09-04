import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

enum SlBadgeVariant { primary, success, warning, danger, neutral }

class SlBadge extends StatelessWidget {
  final String text;
  final SlBadgeVariant variant;
  final Widget? icon;

  const SlBadge({
    super.key,
    required this.text,
    this.variant = SlBadgeVariant.primary,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    Color bg;
    Color border;
    Color textColor;

    switch (variant) {
      case SlBadgeVariant.primary:
        bg = isDark ? AppColors.primary.withAlpha(50) : const Color(0xFFDBEAFE);
        border = isDark ? AppColors.primary.withAlpha(90) : const Color(0xFF93C5FD);
        textColor = isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8);
        break;
      case SlBadgeVariant.success:
        bg = isDark ? AppColors.emerald.withAlpha(50) : const Color(0xFFD1FAE5);
        border = isDark ? AppColors.emerald.withAlpha(90) : const Color(0xFF6EE7B7);
        textColor = isDark ? const Color(0xFF6EE7B7) : const Color(0xFF047857);
        break;
      case SlBadgeVariant.warning:
        bg = isDark ? AppColors.amber.withAlpha(50) : const Color(0xFFFEF3C7);
        border = isDark ? AppColors.amber.withAlpha(90) : const Color(0xFFFCD34D);
        textColor = isDark ? const Color(0xFFFCD34D) : const Color(0xFFB45309);
        break;
      case SlBadgeVariant.danger:
        bg = isDark ? AppColors.rose.withAlpha(50) : const Color(0xFFFFE4E6);
        border = isDark ? AppColors.rose.withAlpha(90) : const Color(0xFFFDA4AF);
        textColor = isDark ? const Color(0xFFFDA4AF) : const Color(0xFFBE123C);
        break;
      case SlBadgeVariant.neutral:
        bg = isDark ? Colors.white.withAlpha(20) : const Color(0xFFF1F5F9);
        border = isDark ? Colors.white.withAlpha(35) : const Color(0xFFCBD5E1);
        textColor = isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155);
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: border, width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            icon!,
            const SizedBox(width: 4),
          ],
          Text(
            text,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: textColor,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}
