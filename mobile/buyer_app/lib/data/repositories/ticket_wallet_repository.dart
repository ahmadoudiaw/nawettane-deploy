import 'package:shared_preferences/shared_preferences.dart';

import '../../core/network/api_client.dart';
import '../models/ticket.dart';

class TicketWalletRepository {
  TicketWalletRepository(this._apiClient);

  static const _storageKey = 'buyer_ticket_ids';
  final ApiClient _apiClient;

  Future<List<String>> getSavedTicketIds() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getStringList(_storageKey) ?? <String>[];
  }

  Future<void> saveTicketIds(List<String> ticketIds) async {
    final prefs = await SharedPreferences.getInstance();
    final current = prefs.getStringList(_storageKey) ?? <String>[];
    final merged = {...current, ...ticketIds}.toList();
    await prefs.setStringList(_storageKey, merged);
  }

  Future<List<TicketModel>> getSavedTickets() async {
    final ids = await getSavedTicketIds();
    final tickets = <TicketModel>[];

    for (final id in ids) {
      try {
        tickets.add(await getTicket(id));
      } catch (_) {
        continue;
      }
    }

    tickets.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return tickets;
  }

  Future<TicketModel> getTicket(String id) {
    return _apiClient.get<TicketModel>(
      '/tickets/$id',
      parser: (json) => TicketModel.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<List<TicketModel>> fetchByPhone(String phone) async {
    final tickets = await _apiClient.get<List<TicketModel>>(
      '/tickets/by-phone?phone=${Uri.encodeComponent(phone)}',
      parser: (json) => (json as List<dynamic>)
          .map((e) => TicketModel.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
    if (tickets.isNotEmpty) {
      await saveTicketIds(tickets.map((t) => t.id).toList());
    }
    return tickets;
  }
}

