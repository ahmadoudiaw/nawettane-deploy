import 'package:flutter/foundation.dart';

import '../../data/models/ticket.dart';
import '../../data/repositories/ticket_wallet_repository.dart';

class TicketWalletController extends ChangeNotifier {
  TicketWalletController(this._repository);

  final TicketWalletRepository _repository;

  bool isLoading = false;
  String? error;
  List<TicketModel> tickets = [];

  Future<void> load() async {
    isLoading = true;
    error = null;
    notifyListeners();

    try {
      tickets = await _repository.getSavedTickets();
    } catch (exception) {
      error = exception.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> saveAndRefresh(List<String> ticketIds) async {
    await _repository.saveTicketIds(ticketIds);
    await load();
  }
}

