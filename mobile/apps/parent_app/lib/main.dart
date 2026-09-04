import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:schoollinx_core/schoollinx_core.dart';
import 'core/router/parent_router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initCoreDependencies();

  runApp(const ParentApp());
}

class ParentApp extends StatelessWidget {
  const ParentApp({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<AuthBloc>(
      create: (context) => sl<AuthBloc>()..add(const CheckAuthStatusEvent()),
      child: MaterialApp.router(
        title: 'SchoolLinx Parent',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.dark,
        routerConfig: parentRouter,
      ),
    );
  }
}
