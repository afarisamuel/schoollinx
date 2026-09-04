import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

class ParentLoginPage extends StatefulWidget {
  const ParentLoginPage({super.key});

  @override
  State<ParentLoginPage> createState() => _ParentLoginPageState();
}

class _ParentLoginPageState extends State<ParentLoginPage> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _onLogin() {
    if (_formKey.currentState?.validate() ?? false) {
      context.read<AuthBloc>().add(
            LoginSubmittedEvent(
              email: _emailController.text.trim(),
              password: _passwordController.text,
            ),
          );
    }
  }

  void _fillParentCredentials() {
    _emailController.text = 'parent@schoollinx.com';
    _passwordController.text = 'password123';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BlocConsumer<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state.status == AuthStatus.tenantRequired) {
          context.go('/tenant-select');
        } else if (state.isAuthenticated) {
          context.go('/dashboard');
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
        final tenant = state.tenant;
        final isLoading = state.status == AuthStatus.loading;

        return Scaffold(
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (tenant != null)
                      InkWell(
                        onTap: () => context.read<AuthBloc>().add(const ChangeTenantEvent()),
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.darkBgSecondary : AppColors.lightBgSecondary,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 28,
                                height: 28,
                                decoration: BoxDecoration(
                                  color: AppColors.emerald.withAlpha(30),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Center(
                                  child: Icon(LucideIcons.school, size: 14, color: AppColors.emeraldLight),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Text(tenant.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                              const SizedBox(width: 8),
                              const Icon(LucideIcons.arrowLeftRight, size: 12, color: AppColors.darkTextMuted),
                            ],
                          ),
                        ),
                      ),

                    const SizedBox(height: 32),

                    Text(
                      'Parent Portal',
                      style: Theme.of(context).textTheme.displayLarge?.copyWith(
                            fontSize: 32,
                            height: 1.1,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Sign in to follow your child\'s attendance, view report cards, and pay term fees effortlessly.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            fontSize: 14,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                          ),
                    ),

                    const SizedBox(height: 32),

                    SlCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SlInput(
                            controller: _emailController,
                            label: 'REGISTERED EMAIL OR PHONE',
                            hintText: 'parent@example.com',
                            keyboardType: TextInputType.emailAddress,
                            prefixIcon: const Icon(LucideIcons.mail, size: 18, color: AppColors.emeraldLight),
                            validator: (val) {
                              if (val == null || val.trim().isEmpty) return 'Email is required';
                              return null;
                            },
                          ),
                          const SizedBox(height: 18),
                          SlInput(
                            controller: _passwordController,
                            label: 'PASSWORD',
                            hintText: '••••••••',
                            obscureText: _obscurePassword,
                            prefixIcon: const Icon(LucideIcons.lock, size: 18, color: AppColors.emeraldLight),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscurePassword ? LucideIcons.eyeOff : LucideIcons.eye,
                                size: 18,
                                color: AppColors.darkTextMuted,
                              ),
                              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                            ),
                            validator: (val) {
                              if (val == null || val.isEmpty) return 'Password is required';
                              return null;
                            },
                          ),
                          const SizedBox(height: 24),
                          SlButton(
                            text: 'Access Parent Dashboard',
                            isLoading: isLoading,
                            icon: const Icon(LucideIcons.logIn, size: 18, color: Colors.white),
                            onPressed: _onLogin,
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    Center(
                      child: TextButton.icon(
                        onPressed: _fillParentCredentials,
                        icon: const Icon(LucideIcons.userCheck, size: 16, color: AppColors.emerald),
                        label: const Text(
                          'Fill Sample Parent Account',
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
