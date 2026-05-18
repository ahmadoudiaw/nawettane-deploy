import '../../core/network/api_client.dart';
import '../models/local_ticket.dart';

class OfflineTicketRepository {
  OfflineTicketRepository(this._apiClient);

  final ApiClient _apiClient;

  /// Appelle GET /agent/offline/tickets?matchId={id}.
  /// Retourne les tickets valides (non annulés) pour ce match.
  Future<List<LocalTicket>> getOfflineTickets(String matchId) {
    return _apiClient.get<List<LocalTicket>>(
      '/agent/offline/tickets?matchId=$matchId',
      authenticated: true,
      parser: (json) {
        final data = json as Map<String, dynamic>;
        final list = (data['tickets'] as List<dynamic>? ?? [])
            .whereType<Map<String, dynamic>>();
        return list.map(LocalTicket.fromOfflineResponse).toList();
      },
    );
  }
}
