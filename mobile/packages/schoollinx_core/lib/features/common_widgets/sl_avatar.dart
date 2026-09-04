import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

class SlAvatar extends StatelessWidget {
  final String initials;
  final String? imageUrl;
  final double size;
  final Color? backgroundColor;
  final Color? textColor;

  const SlAvatar({
    super.key,
    required this.initials,
    this.imageUrl,
    this.size = 48.0,
    this.backgroundColor,
    this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    if (imageUrl != null && imageUrl!.isNotEmpty) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(size * 0.35),
          image: DecorationImage(
            image: NetworkImage(imageUrl!),
            fit: BoxFit.cover,
          ),
          border: Border.all(
            color: AppColors.primary.withAlpha(50),
            width: 1.5,
          ),
        ),
      );
    }

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: backgroundColor ?? AppColors.primary.withAlpha(35),
        borderRadius: BorderRadius.circular(size * 0.35),
        border: Border.all(
          color: AppColors.primary.withAlpha(60),
          width: 1.5,
        ),
      ),
      child: Center(
        child: Text(
          initials,
          style: TextStyle(
            color: textColor ?? AppColors.primaryLight,
            fontWeight: FontWeight.w800,
            fontSize: size * 0.38,
            letterSpacing: 0.5,
          ),
        ),
      ),
    );
  }
}
