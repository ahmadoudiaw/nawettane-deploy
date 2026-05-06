import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';
import '../../data/repositories/ticket_wallet_repository.dart';

class AppBootstrapController extends ChangeNotifier {
  AppBootstrapController({
    required ApiClient apiClient,
    required TicketWalletRepository ticketWalletRepository,
  })  : _apiClient = apiClient,
        _ticketWalletRepository = ticketWalletRepository;

  final ApiClient _apiClient;
  final TicketWalletRepository _ticketWalletRepository;

  bool isLoading = true;
  String? error;

  Future<void> initialize() async {
    try {
      await _apiClient.get('/matches', authenticated: true, parser: (_) => true);
      await _ticketWalletRepository.getSavedTicketIds();
      error = null;
    } catch (exception) {
      error = exception.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }
}

