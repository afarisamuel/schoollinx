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
    Color bg;
    Color border;
    Color textColor;

    switch (variant) {
      case SlBadgeVariant.primary:
        bg = AppColors.primary.withAlpha(25);
        border = AppColors.primary.withAlpha(50);
        textColor = AppColors.primaryLight;
        break;
      case SlBadgeVariant.success:
        bg = AppColors.emerald.withAlpha(25);
        border = AppColors.emerald.withAlpha(50);
        textColor = AppColors.emeraldLight;
        break;
      case SlBadgeVariant.warning:
        bg = AppColors.amber.withAlpha(25);
        border = AppColors.amber.withAlpha(50);
        textColor = AppColors.amber;
        break;
      case SlBadgeVariant.danger:
        bg = AppColors.rose.withAlpha(25);
        border = AppColors.rose.withAlpha(50);
        textColor = AppColors.roseLight;
        break;
      case SlBadgeVariant.neutral:
        bg = Colors.white.withAlpha(15);
        border = Colors.white.withAlpha(25);
        textColor = Colors.white.withAlpha(180);
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
