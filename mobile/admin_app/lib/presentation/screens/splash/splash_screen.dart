import 'package:flutter/material.dart';

import '../../../app.dart';
import '../../../navigation/app_router.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  bool _navigated = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    AdminAppScope.of(context).authController.addListener(_handleAuthChange);
    _handleAuthChange();
  }

  @override
  void dispose() {
    AdminAppScope.of(context).authController.removeListener(_handleAuthChange);
    super.dispose();
  }

  void _handleAuthChange() {
    final authController = AdminAppScope.of(context).authController;
    if (_navigated || authController.isLoading) {
      return;
    }

    _navigated = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }

      Navigator.of(context).pushReplacementNamed(
        authController.isAuthenticated ? AppRouter.shell : AppRouter.login,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0D5C8B), Color(0xFF19466A), Color(0xFFE4B136)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(28),
                  child: Image.asset(
                    'assets/images/logo.png',
                    width: 124,
                    height: 124,
                    fit: BoxFit.cover,
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'NAWETTANE Supervision',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Chargement du tableau de bord mobile',
                  style: TextStyle(color: Color(0xFFF8F6EE)),
                ),
                const SizedBox(height: 24),
                const CircularProgressIndicator(color: Colors.white),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
