import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

enum SlButtonVariant { primary, secondary, danger, ghost }

class SlButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final Widget? icon;
  final SlButtonVariant variant;
  final double? width;
  final double height;
  final double borderRadius;

  const SlButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.isLoading = false,
    this.icon,
    this.variant = SlButtonVariant.primary,
    this.width,
    this.height = 54.0,
    this.borderRadius = 18.0,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    Color bg;
    Color textColor;
    Border? border;
    Gradient? gradient;

    switch (variant) {
      case SlButtonVariant.primary:
        bg = AppColors.primary;
        textColor = Colors.white;
        gradient = const LinearGradient(
          colors: [AppColors.primaryGradientStart, AppColors.primaryGradientEnd],
        );
        break;
      case SlButtonVariant.secondary:
        bg = isDark ? AppColors.darkBgSecondary : AppColors.lightBgSecondary;
        textColor = isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary;
        border = Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
          width: 1.2,
        );
        break;
      case SlButtonVariant.danger:
        bg = AppColors.rose;
        textColor = Colors.white;
        break;
      case SlButtonVariant.ghost:
        bg = Colors.transparent;
        textColor = isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;
        break;
    }

    final isEnabled = onPressed != null && !isLoading;

    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: bg,
        gradient: isEnabled ? gradient : null,
        borderRadius: BorderRadius.circular(borderRadius),
        border: border,
        boxShadow: variant == SlButtonVariant.primary && isEnabled
            ? [
                BoxShadow(
                  color: AppColors.primary.withAlpha(80),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ]
            : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: isEnabled ? onPressed : null,
          borderRadius: BorderRadius.circular(borderRadius),
          child: Center(
            child: isLoading
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : Row(
                    mainAxisSize: MainAxisSize.min,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (icon != null) ...[
                        icon!,
                        const SizedBox(width: 8),
                      ],
                      Text(
                        text,
                        style: TextStyle(
                          color: isEnabled ? textColor : textColor.withAlpha(120),
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.2,
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}
