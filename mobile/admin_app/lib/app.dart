import 'package:flutter/material.dart';

import 'core/config/app_config.dart';
import 'core/network/api_client.dart';
import 'core/theme/app_theme.dart';
import 'data/repositories/auth_repository.dart';
import 'data/repositories/matches_repository.dart';
import 'data/repositories/reports_repository.dart';
import 'data/repositories/session_repository.dart';
import 'data/repositories/users_repository.dart';
import 'navigation/app_router.dart';
import 'presentation/controllers/auth_controller.dart';

class NawettaneAdminApp extends StatefulWidget {
  const NawettaneAdminApp({super.key});

  @override
  State<NawettaneAdminApp> createState() => _NawettaneAdminAppState();
}

class _NawettaneAdminAppState extends State<NawettaneAdminApp> {
  late final SessionRepository _sessionRepository;
  late final ApiClient _apiClient;
  late final AuthRepository _authRepository;
  late final MatchesRepository _matchesRepository;
  late final ReportsRepository _reportsRepository;
  late final UsersRepository _usersRepository;
  late final AuthController _authController;

  @override
  void initState() {
    super.initState();
    _sessionRepository = SessionRepository();
    _apiClient = ApiClient(
      baseUrl: AppConfig.apiBaseUrl,
      sessionRepository: _sessionRepository,
    );
    _authRepository = AuthRepository(_apiClient, _sessionRepository);
    _matchesRepository = MatchesRepository(_apiClient);
    _reportsRepository = ReportsRepository(_apiClient);
    _usersRepository = UsersRepository(_apiClient);
    _authController = AuthController(_authRepository)..bootstrap();
  }

  @override
  void dispose() {
    _authController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AdminAppScope(
      authController: _authController,
      authRepository: _authRepository,
      matchesRepository: _matchesRepository,
      reportsRepository: _reportsRepository,
      usersRepository: _usersRepository,
      sessionRepository: _sessionRepository,
      child: MaterialApp(
        title: 'NAWETTANE Admin Mobile',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        initialRoute: AppRouter.splash,
        onGenerateRoute: AppRouter.onGenerateRoute,
      ),
    );
  }
}

class AdminAppScope extends InheritedWidget {
  const AdminAppScope({
    super.key,
    required this.authController,
    required this.authRepository,
    required this.matchesRepository,
    required this.reportsRepository,
    required this.usersRepository,
    required this.sessionRepository,
    required super.child,
  });

  final AuthController authController;
  final AuthRepository authRepository;
  final MatchesRepository matchesRepository;
  final ReportsRepository reportsRepository;
  final UsersRepository usersRepository;
  final SessionRepository sessionRepository;

  static AdminAppScope of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AdminAppScope>();
    assert(scope != null, 'AdminAppScope introuvable.');
    return scope!;
  }

  @override
  bool updateShouldNotify(covariant AdminAppScope oldWidget) => false;
}
