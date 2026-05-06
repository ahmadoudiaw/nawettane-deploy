import 'package:flutter/material.dart';

import '../../../app.dart';
import '../../../navigation/app_router.dart';
import '../../controllers/auth_controller.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  bool _navigated = false;
  bool _initialized = false;
  AuthController? _authController;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      _initialized = true;
      _authController = AgentAppScope.of(context).authController;
      _authController!.addListener(_handleAuthChange);
      _handleAuthChange();
    }
  }

  @override
  void dispose() {
    _authController?.removeListener(_handleAuthChange);
    super.dispose();
  }

  void _handleAuthChange() {
    final ctrl = _authController;
    if (ctrl == null || _navigated || ctrl.isLoading) return;

    _navigated = true;
    final route = ctrl.isAuthenticated ? AppRouter.matches : AppRouter.login;
    debugPrint('[SPLASH] auth ready — navigating to: $route');
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      Navigator.of(context).pushReplacementNamed(route);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0D3B27), Color(0xFF0E5B39), Color(0xFFF1B63A)],
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
                  'NAWETTANE Guichet',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Préparation du contrôle d’entrée',
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
