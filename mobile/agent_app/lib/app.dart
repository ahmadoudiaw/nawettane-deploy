import 'package:flutter/material.dart';

import 'core/config/app_config.dart';
import 'core/network/api_client.dart';
import 'core/theme/app_theme.dart';
import 'data/repositories/auth_repository.dart';
import 'data/repositories/matches_repository.dart';
import 'data/repositories/scan_repository.dart';
import 'data/repositories/session_repository.dart';
import 'navigation/app_router.dart';
import 'presentation/controllers/auth_controller.dart';

class NawettaneAgentApp extends StatefulWidget {
  const NawettaneAgentApp({super.key});

  @override
  State<NawettaneAgentApp> createState() => _NawettaneAgentAppState();
}

class _NawettaneAgentAppState extends State<NawettaneAgentApp> {
  late final SessionRepository _sessionRepository;
  late final ApiClient _apiClient;
  late final AuthRepository _authRepository;
  late final MatchesRepository _matchesRepository;
  late final ScanRepository _scanRepository;
  late final AuthController _authController;

  @override
  void initState() {
    super.initState();
    debugPrint('AGENT API_BASE_URL = ${AppConfig.apiBaseUrl}');
    _sessionRepository = SessionRepository();
    _apiClient = ApiClient(
      baseUrl: AppConfig.apiBaseUrl,
      sessionRepository: _sessionRepository,
    );
    _authRepository = AuthRepository(_apiClient, _sessionRepository);
    _matchesRepository = MatchesRepository(_apiClient);
    _scanRepository = ScanRepository(_apiClient);
    _authController = AuthController(_authRepository)..bootstrap();
  }

  @override
  void dispose() {
    _authController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AgentAppScope(
      authController: _authController,
      authRepository: _authRepository,
      matchesRepository: _matchesRepository,
      scanRepository: _scanRepository,
      sessionRepository: _sessionRepository,
      child: MaterialApp(
        title: 'NAWETTANE Agent',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        initialRoute: AppRouter.splash,
        onGenerateRoute: AppRouter.onGenerateRoute,
      ),
    );
  }
}

class AgentAppScope extends InheritedWidget {
  const AgentAppScope({
    super.key,
    required this.authController,
    required this.authRepository,
    required this.matchesRepository,
    required this.scanRepository,
    required this.sessionRepository,
    required super.child,
  });

  final AuthController authController;
  final AuthRepository authRepository;
  final MatchesRepository matchesRepository;
  final ScanRepository scanRepository;
  final SessionRepository sessionRepository;

  static AgentAppScope of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AgentAppScope>();
    assert(scope != null, 'AgentAppScope introuvable.');
    return scope!;
  }

  @override
  bool updateShouldNotify(covariant AgentAppScope oldWidget) => false;
}
