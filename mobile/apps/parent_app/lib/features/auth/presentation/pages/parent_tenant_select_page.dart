import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

class ParentTenantSelectPage extends StatefulWidget {
  const ParentTenantSelectPage({super.key});

  @override
  State<ParentTenantSelectPage> createState() => _ParentTenantSelectPageState();
}

class _ParentTenantSelectPageState extends State<ParentTenantSelectPage> {
  final _codeController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  void _onContinue() {
    if (_formKey.currentState?.validate() ?? false) {
      final code = _codeController.text.trim();
      context.read<AuthBloc>().add(ResolveTenantEvent(code: code));
    }
  }

  void _useDemoSchool() {
    _codeController.text = 'THINKCE';
    context.read<AuthBloc>().add(const ResolveTenantEvent(code: 'THINKCE'));
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BlocConsumer<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state.hasTenant && state.status == AuthStatus.unauthenticated) {
          context.go('/login');
        } else if (state.status == AuthStatus.error && state.errorMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.errorMessage!),
              backgroundColor: AppColors.rose,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      },
      builder: (context, state) {
        final isLoading = state.status == AuthStatus.loading;

        return Scaffold(
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 30),
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: AppColors.emerald.withAlpha(30),
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: AppColors.emerald.withAlpha(60)),
                      ),
                      child: const Center(
                        child: Icon(
                          LucideIcons.heartHandshake,
                          color: AppColors.emeraldLight,
                          size: 28,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    Text(
                      'SchoolLinx\nParent Portal',
                      style: Theme.of(context).textTheme.displayLarge?.copyWith(
                            fontSize: 30,
                            height: 1.15,
                          ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'Connect to your child\'s school to view real-time academic progress, fee balances, and bus tracking.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            fontSize: 14,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                          ),
                    ),
                    const SizedBox(height: 36),

                    SlCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SlInput(
                            controller: _codeController,
                            label: 'CHILD\'S SCHOOL CODE',
                            hintText: 'e.g. THINKCE',
                            prefixIcon: const Icon(LucideIcons.school, size: 20, color: AppColors.emeraldLight),
                            validator: (val) {
                              if (val == null || val.trim().isEmpty) return 'Please enter the school code';
                              return null;
                            },
                          ),
                          const SizedBox(height: 20),
                          SlButton(
                            text: 'Connect to School',
                            isLoading: isLoading,
                            icon: const Icon(LucideIcons.arrowRight, size: 18, color: Colors.white),
                            onPressed: _onContinue,
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    Center(
                      child: TextButton.icon(
                        onPressed: isLoading ? null : _useDemoSchool,
                        icon: const Icon(LucideIcons.sparkles, size: 16, color: AppColors.emerald),
                        label: const Text(
                          'Connect to ThinkCE Demo School',
                          style: TextStyle(
                            color: AppColors.emerald,
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
