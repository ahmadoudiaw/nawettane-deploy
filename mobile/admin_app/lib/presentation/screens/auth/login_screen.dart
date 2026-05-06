import 'package:flutter/material.dart';

import '../../../app.dart';
import '../../../navigation/app_router.dart';
import '../../controllers/auth_controller.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  AuthController? _authController;
  bool _obscurePassword = true;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _authController ??= AdminAppScope.of(context).authController
      ..addListener(_handleAuthChange);
    final authController = _authController!;
    if (authController.isAuthenticated) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          Navigator.of(context).pushReplacementNamed(AppRouter.shell);
        }
      });
    }
  }

  @override
  void dispose() {
    _authController?.removeListener(_handleAuthChange);
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _handleAuthChange() {
    final authController = _authController;
    if (authController == null) {
      return;
    }
    if (authController.isAuthenticated && mounted) {
      Navigator.of(context).pushReplacementNamed(AppRouter.shell);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authController = _authController ?? AdminAppScope.of(context).authController;

    return Scaffold(
      body: SafeArea(
        child: AnimatedBuilder(
          animation: authController,
          builder: (context, _) {
            return ListView(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
              children: [
                Container(
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(28),
                    gradient: const LinearGradient(
                      colors: [Color(0xFF0D5C8B), Color(0xFF19466A), Color(0xFFE4B136)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                  ),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Align(
                        alignment: Alignment.topRight,
                        child: ClipRRect(
                          borderRadius: BorderRadius.all(Radius.circular(18)),
                          child: Image(
                            image: AssetImage('assets/images/logo.png'),
                            width: 72,
                            height: 72,
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                      SizedBox(height: 12),
                      Text(
                        'NAWETTANE Supervision',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 30,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      SizedBox(height: 10),
                      Text(
                        'Tableau de bord mobile pour le suivi des matchs et des rapports.',
                        style: TextStyle(color: Color(0xFFF8F6EE), height: 1.45),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                Text('Connexion admin', style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: 12),
                Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      TextFormField(
                        controller: _identifierController,
                        decoration: const InputDecoration(
                          labelText: 'Email ou téléphone',
                          prefixIcon: Icon(Icons.person_outline),
                        ),
                        validator: (value) =>
                            value == null || value.trim().isEmpty ? 'Champ requis' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        decoration: InputDecoration(
                          labelText: 'Mot de passe',
                          prefixIcon: const Icon(Icons.lock_outline),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
                            ),
                            tooltip: _obscurePassword
                                ? 'Afficher le mot de passe'
                                : 'Masquer le mot de passe',
                            onPressed: () =>
                                setState(() => _obscurePassword = !_obscurePassword),
                          ),
                        ),
                        validator: (value) =>
                            value == null || value.trim().isEmpty ? 'Champ requis' : null,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                if (authController.error != null)
                  Text(authController.error!, style: const TextStyle(color: Colors.red)),
                const SizedBox(height: 12),
                SizedBox(
                  height: 56,
                  child: FilledButton(
                    onPressed: authController.isLoading ? null : _submit,
                    child: Text(authController.isLoading ? 'Connexion...' : 'Se connecter'),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    await AdminAppScope.of(context).authController.login(
      identifier: _identifierController.text.trim(),
      password: _passwordController.text.trim(),
    );
  }
}
