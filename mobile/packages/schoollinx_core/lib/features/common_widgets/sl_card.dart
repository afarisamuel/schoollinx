import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

class SlCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final VoidCallback? onTap;
  final Color? backgroundColor;
  final Color? borderColor;
  final dynamic borderRadius;
  final bool hasGradient;

  const SlCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.onTap,
    this.backgroundColor,
    this.borderColor,
    this.borderRadius = 24.0,
    this.hasGradient = false,
  });

  BorderRadius _getBorderRadius() {
    if (borderRadius is BorderRadius) return borderRadius as BorderRadius;
    if (borderRadius is double) return BorderRadius.circular(borderRadius as double);
    if (borderRadius is int) return BorderRadius.circular((borderRadius as int).toDouble());
    return BorderRadius.circular(24.0);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final defaultBg = isDark ? AppColors.darkCardBg : AppColors.lightCardBg;
    final defaultBorder = isDark ? AppColors.darkBorder : AppColors.lightBorder;
    final br = _getBorderRadius();

    Widget content = Container(
      margin: margin,
      padding: padding ?? const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: backgroundColor ?? defaultBg,
        gradient: hasGradient
            ? LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: isDark
                    ? [const Color(0xFF162238), const Color(0xFF0D1526)]
                    : [Colors.white, const Color(0xFFF8FAFC)],
              )
            : null,
        borderRadius: br,
        border: Border.all(
          color: borderColor ?? defaultBorder,
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: isDark ? Colors.black.withAlpha(50) : Colors.black.withAlpha(10),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: child,
    );

    if (onTap != null) {
      return Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: br,
          child: content,
        ),
      );
    }

    return content;
  }
}
