import 'package:flutter/material.dart';

import '../../app.dart';
import '../../navigation/app_router.dart';
import '../controllers/app_bootstrap_controller.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  AppBootstrapController? _controller;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _controller ??= BuyerAppScope.of(context).bootstrapController
      ..addListener(_handleBootstrap);
    _handleBootstrap();
  }

  @override
  void dispose() {
    _controller?.removeListener(_handleBootstrap);
    super.dispose();
  }

  void _handleBootstrap() {
    final controller = _controller;
    if (controller == null) {
      return;
    }

    if (!mounted || controller.isLoading) {
      return;
    }

    if (controller.error == null) {
      Navigator.of(context).pushReplacementNamed(AppRouter.home);
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller ?? BuyerAppScope.of(context).bootstrapController;
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0E7A46), Color(0xFF114C31), Color(0xFFF3B319)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: AnimatedBuilder(
            animation: controller,
            builder: (context, _) {
              return Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Spacer(),
                    const Text(
                      'NAWETTANE',
                      style: TextStyle(
                        fontSize: 38,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                        letterSpacing: 1.1,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Billetterie mobile pour les matchs de quartier au Sénégal.',
                      style: TextStyle(
                        fontSize: 16,
                        color: Color(0xFFF8F6EE),
                        height: 1.4,
                      ),
                    ),
                    const Spacer(),
                    if (controller.error != null) ...[
                      Text(
                        controller.error!,
                        style: const TextStyle(color: Colors.white),
                      ),
                      const SizedBox(height: 16),
                      FilledButton(
                        onPressed: controller.initialize,
                        child: const Text('Réessayer'),
                      ),
                    ] else ...[
                      const CircularProgressIndicator(color: Colors.white),
                      const SizedBox(height: 12),
                      const Text(
                        'Connexion au backend Nawettane...',
                        style: TextStyle(color: Colors.white),
                      ),
                    ],
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
