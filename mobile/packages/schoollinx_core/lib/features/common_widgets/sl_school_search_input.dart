import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/di/injection_container.dart';
import '../../core/theme/app_colors.dart';
import '../auth/domain/entities/tenant_entity.dart';
import '../auth/domain/usecases/search_tenants_usecase.dart';
import 'sl_avatar.dart';
import 'sl_badge.dart';
import 'sl_input.dart';

class SlSchoolSearchInput extends StatefulWidget {
  final TextEditingController controller;
  final ValueChanged<TenantEntity>? onSelected;
  final ValueChanged<String>? onChanged;
  final FormFieldValidator<String>? validator;
  final String label;
  final String hintText;
  final bool autoFocus;

  const SlSchoolSearchInput({
    super.key,
    required this.controller,
    this.onSelected,
    this.onChanged,
    this.validator,
    this.label = 'INSTITUTION CODE OR NAME',
    this.hintText = 'Type to search school (e.g. ThinkCE)',
    this.autoFocus = false,
  });

  @override
  State<SlSchoolSearchInput> createState() => _SlSchoolSearchInputState();
}

class _SlSchoolSearchInputState extends State<SlSchoolSearchInput> {
  final LayerLink _layerLink = LayerLink();
  final FocusNode _focusNode = FocusNode();
  OverlayEntry? _overlayEntry;
  Timer? _debounceTimer;

  List<TenantEntity> _suggestions = [];
  bool _isSearching = false;
  bool _hasSearched = false;

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(_onFocusChanged);
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _removeOverlay();
    _focusNode.removeListener(_onFocusChanged);
    _focusNode.dispose();
    super.dispose();
  }

  void _onFocusChanged() {
    if (_focusNode.hasFocus) {
      _onTextChanged(widget.controller.text);
    } else {
      // Delay closing to allow tap gesture to register
      Future.delayed(const Duration(milliseconds: 200), () {
        if (mounted && !_focusNode.hasFocus) {
          _removeOverlay();
        }
      });
    }
  }

  void _onTextChanged(String query) {
    widget.onChanged?.call(query);
    _debounceTimer?.cancel();

    if (query.trim().isEmpty) {
      setState(() {
        _suggestions = [];
        _isSearching = false;
        _hasSearched = false;
      });
      _removeOverlay();
      return;
    }

    _debounceTimer = Timer(const Duration(milliseconds: 250), () async {
      if (!mounted) return;
      setState(() => _isSearching = true);
      _showOverlay();

      try {
        final useCase = sl<SearchTenantsUseCase>();
        final result = await useCase(query.trim());
        if (!mounted) return;

        result.fold(
          (failure) {
            setState(() {
              _suggestions = [];
              _isSearching = false;
              _hasSearched = true;
            });
            _updateOverlay();
          },
          (tenants) {
            setState(() {
              _suggestions = tenants;
              _isSearching = false;
              _hasSearched = true;
            });
            _updateOverlay();
          },
        );
      } catch (_) {
        if (mounted) {
          setState(() {
            _suggestions = [];
            _isSearching = false;
            _hasSearched = true;
          });
          _updateOverlay();
        }
      }
    });
  }

  void _selectTenant(TenantEntity tenant) {
    final code = (tenant.code?.isNotEmpty == true ? tenant.code! : tenant.id);
    widget.controller.text = code;
    widget.controller.selection = TextSelection.fromPosition(
      TextPosition(offset: widget.controller.text.length),
    );
    widget.onSelected?.call(tenant);
    _focusNode.unfocus();
    _removeOverlay();
  }

  void _showOverlay() {
    if (_overlayEntry == null) {
      _overlayEntry = _createOverlayEntry();
      Overlay.of(context).insert(_overlayEntry!);
    } else {
      _overlayEntry!.markNeedsBuild();
    }
  }

  void _updateOverlay() {
    if (_overlayEntry != null && mounted) {
      _overlayEntry!.markNeedsBuild();
    } else if (mounted && _focusNode.hasFocus) {
      _showOverlay();
    }
  }

  void _removeOverlay() {
    _overlayEntry?.remove();
    _overlayEntry = null;
  }

  OverlayEntry _createOverlayEntry() {
    final renderBox = context.findRenderObject() as RenderBox?;
    final size = renderBox?.size ?? const Size(300, 56);

    return OverlayEntry(
      builder: (context) {
        final isDark = Theme.of(context).brightness == Brightness.dark;

        return Positioned(
          width: size.width,
          child: CompositedTransformFollower(
            link: _layerLink,
            showWhenUnlinked: false,
            offset: Offset(0, size.height + 6),
            child: Material(
              elevation: 12,
              borderRadius: BorderRadius.circular(16),
              color: isDark ? AppColors.darkBgSecondary : AppColors.lightBgSecondary,
              child: Container(
                constraints: const BoxConstraints(maxHeight: 250),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                    width: 1.5,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withAlpha(isDark ? 80 : 30),
                      blurRadius: 16,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: _buildSuggestionList(isDark),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildSuggestionList(bool isDark) {
    if (_isSearching) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 20),
        child: Center(
          child: SizedBox(
            width: 24,
            height: 24,
            child: CircularProgressIndicator(strokeWidth: 2.5),
          ),
        ),
      );
    }

    if (_suggestions.isEmpty && _hasSearched) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 16),
        child: Row(
          children: [
            Icon(
              Icons.info_outline,
              size: 18,
              color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'No matching school found for "${widget.controller.text}"',
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                ),
              ),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(vertical: 6),
      shrinkWrap: true,
      itemCount: _suggestions.length,
      separatorBuilder: (_, _) => Divider(
        height: 1,
        color: isDark ? AppColors.darkBorder.withAlpha(50) : AppColors.lightBorder.withAlpha(50),
      ),
      itemBuilder: (context, index) {
        final tenant = _suggestions[index];
        final initials = tenant.name.isNotEmpty
            ? tenant.name.split(' ').map((e) => e.isNotEmpty ? e[0] : '').take(2).join()
            : 'S';
        final displayCode = (tenant.code?.isNotEmpty == true ? tenant.code! : tenant.id).toUpperCase();
        final displayDomain = (tenant.domain?.isNotEmpty == true ? tenant.domain! : displayCode);

        return InkWell(
          onTap: () => _selectTenant(tenant),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            child: Row(
              children: [
                SlAvatar(
                  initials: initials,
                  imageUrl: tenant.logoUrl,
                  size: 36,
                  backgroundColor: AppColors.primary.withAlpha(35),
                  textColor: AppColors.primaryLight,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        tenant.name,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        displayDomain,
                        style: TextStyle(
                          fontSize: 11,
                          color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                SlBadge(
                  text: displayCode,
                  variant: SlBadgeVariant.primary,
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return CompositedTransformTarget(
      link: _layerLink,
      child: SlInput(
        controller: widget.controller,
        focusNode: _focusNode,
        label: widget.label,
        hintText: widget.hintText,
        autofocus: widget.autoFocus,
        prefixIcon: const Icon(Icons.search, size: 20, color: AppColors.primary),
        suffixIcon: widget.controller.text.isNotEmpty
            ? IconButton(
                icon: const Icon(Icons.close, size: 18),
                onPressed: () {
                  widget.controller.clear();
                  _onTextChanged('');
                },
              )
            : null,
        onChanged: _onTextChanged,
        validator: widget.validator,
      ),
    );
  }
}
