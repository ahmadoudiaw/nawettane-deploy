import 'package:flutter/material.dart';

import 'core/config/app_config.dart';
import 'core/network/api_client.dart';
import 'core/offline/connectivity_service.dart';
import 'core/offline/offline_bootstrap_service.dart';
import 'core/offline/offline_scan_validator_service.dart';
import 'core/offline/offline_storage_service.dart';
import 'core/offline/offline_sync_service.dart';
import 'core/offline/sync_queue_service.dart';
import 'data/repositories/offline_ticket_repository.dart';
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
  late final OfflineStorageService _offlineStorageService;
  late final SyncQueueService _syncQueueService;
  late final OfflineTicketRepository _offlineTicketRepository;
  late final OfflineBootstrapService _offlineBootstrapService;
  late final OfflineScanValidatorService _offlineScanValidatorService;
  late final OfflineSyncService _offlineSyncService;

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
    _offlineStorageService = OfflineStorageService();
    _syncQueueService = SyncQueueService();
    _offlineTicketRepository = OfflineTicketRepository(_apiClient);
    _offlineBootstrapService = OfflineBootstrapService(
      matchesRepository: _matchesRepository,
      offlineTicketRepository: _offlineTicketRepository,
      storageService: _offlineStorageService,
      connectivityService: ConnectivityService(),
      syncQueueService: _syncQueueService,
    );
    _offlineScanValidatorService = OfflineScanValidatorService(
      storageService: _offlineStorageService,
      syncQueueService: _syncQueueService,
    );
    _offlineSyncService = OfflineSyncService(
      apiClient: _apiClient,
      syncQueueService: _syncQueueService,
    );
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
      offlineBootstrapService: _offlineBootstrapService,
      offlineScanValidatorService: _offlineScanValidatorService,
      offlineSyncService: _offlineSyncService,
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
    required this.offlineBootstrapService,
    required this.offlineScanValidatorService,
    required this.offlineSyncService,
    required super.child,
  });

  final AuthController authController;
  final AuthRepository authRepository;
  final MatchesRepository matchesRepository;
  final ScanRepository scanRepository;
  final SessionRepository sessionRepository;
  final OfflineBootstrapService offlineBootstrapService;
  final OfflineScanValidatorService offlineScanValidatorService;
  final OfflineSyncService offlineSyncService;

  static AgentAppScope of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AgentAppScope>();
    assert(scope != null, 'AgentAppScope introuvable.');
    return scope!;
  }

  @override
  bool updateShouldNotify(covariant AgentAppScope oldWidget) => false;
}
