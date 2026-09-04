import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

class AdminTenantSelectPage extends StatefulWidget {
  const AdminTenantSelectPage({super.key});

  @override
  State<AdminTenantSelectPage> createState() => _AdminTenantSelectPageState();
}

class _AdminTenantSelectPageState extends State<AdminTenantSelectPage> {
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
                        color: AppColors.amber.withAlpha(30),
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: AppColors.amber.withAlpha(60)),
                      ),
                      child: const Center(
                        child: Icon(
                          LucideIcons.shieldCheck,
                          color: AppColors.amber,
                          size: 28,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    Text(
                      'SchoolLinx\nAdmin Console',
                      style: Theme.of(context).textTheme.displayLarge?.copyWith(
                            fontSize: 30,
                            height: 1.15,
                          ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'Connect to your institutional dashboard to oversee faculty, academic operations, and finance.',
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
                          SlSchoolSearchInput(
                            controller: _codeController,
                            label: 'INSTITUTION CODE OR NAME',
                            hintText: 'Type to search school (e.g. ThinkCE)',
                            onSelected: (tenant) {
                              final code = tenant.code?.isNotEmpty == true ? tenant.code! : tenant.id;
                              context.read<AuthBloc>().add(ResolveTenantEvent(code: code));
                            },
                            validator: (val) {
                              if (val == null || val.trim().isEmpty) {
                                return 'Enter or select your school';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 20),
                          SlButton(
                            text: 'Access Admin Console',
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
                        icon: const Icon(LucideIcons.sparkles, size: 16, color: AppColors.amber),
                        label: const Text(
                          'Use Default School (ThinkCE School)',
                          style: TextStyle(
                            color: AppColors.amber,
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
