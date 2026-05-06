import 'package:flutter/material.dart';

import 'core/config/app_config.dart';
import 'core/network/api_client.dart';
import 'core/theme/app_theme.dart';
import 'data/repositories/checkout_repository.dart';
import 'data/repositories/matches_repository.dart';
import 'data/repositories/ticket_wallet_repository.dart';
import 'navigation/app_router.dart';
import 'presentation/controllers/app_bootstrap_controller.dart';

class NawettaneBuyerApp extends StatefulWidget {
  const NawettaneBuyerApp({super.key});

  @override
  State<NawettaneBuyerApp> createState() => _NawettaneBuyerAppState();
}

class _NawettaneBuyerAppState extends State<NawettaneBuyerApp> {
  late final ApiClient _apiClient;
  late final MatchesRepository _matchesRepository;
  late final CheckoutRepository _checkoutRepository;
  late final TicketWalletRepository _ticketWalletRepository;
  late final AppBootstrapController _bootstrapController;

  @override
  void initState() {
    super.initState();
    _apiClient = ApiClient(baseUrl: AppConfig.apiBaseUrl);
    _matchesRepository = MatchesRepository(_apiClient);
    _checkoutRepository = CheckoutRepository(_apiClient);
    _ticketWalletRepository = TicketWalletRepository(_apiClient);
    _bootstrapController = AppBootstrapController(
      apiClient: _apiClient,
      ticketWalletRepository: _ticketWalletRepository,
    );
    _bootstrapController.initialize();
  }

  @override
  void dispose() {
    _bootstrapController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BuyerAppScope(
      apiClient: _apiClient,
      matchesRepository: _matchesRepository,
      checkoutRepository: _checkoutRepository,
      ticketWalletRepository: _ticketWalletRepository,
      bootstrapController: _bootstrapController,
      child: MaterialApp(
        title: 'NAWETTANE Buyer',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        initialRoute: AppRouter.splash,
        onGenerateRoute: AppRouter.onGenerateRoute,
      ),
    );
  }
}

class BuyerAppScope extends InheritedWidget {
  const BuyerAppScope({
    super.key,
    required this.apiClient,
    required this.matchesRepository,
    required this.checkoutRepository,
    required this.ticketWalletRepository,
    required this.bootstrapController,
    required super.child,
  });

  final ApiClient apiClient;
  final MatchesRepository matchesRepository;
  final CheckoutRepository checkoutRepository;
  final TicketWalletRepository ticketWalletRepository;
  final AppBootstrapController bootstrapController;

  static BuyerAppScope of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<BuyerAppScope>();
    assert(scope != null, 'BuyerAppScope not found in widget tree.');
    return scope!;
  }

  @override
  bool updateShouldNotify(covariant BuyerAppScope oldWidget) => false;
}

