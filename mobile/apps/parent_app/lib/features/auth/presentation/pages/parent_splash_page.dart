import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

class ParentSplashPage extends StatelessWidget {
  const ParentSplashPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state.status == AuthStatus.tenantRequired) {
          context.go('/tenant-select');
        } else if (state.status == AuthStatus.unauthenticated) {
          context.go('/login');
        } else if (state.status == AuthStatus.authenticated) {
          context.go('/dashboard');
        }
      },
      child: const Scaffold(
        body: Center(
          child: SizedBox(
            width: 32,
            height: 32,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              valueColor: AlwaysStoppedAnimation<Color>(AppColors.emeraldLight),
            ),
          ),
        ),
      ),
    );
  }
}
