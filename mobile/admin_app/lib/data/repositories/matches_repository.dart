import '../../core/network/api_client.dart';
import '../models/match.dart';

class MatchesRepository {
  MatchesRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<List<MatchModel>> getMatches() {
    return _apiClient.get<List<MatchModel>>(
      '/matches',
      authenticated: true,
      parser: (json) {
        final items = (json as List<dynamic>? ?? []).whereType<Map<String, dynamic>>();
        return items.map(MatchModel.fromJson).toList();
      },
    );
  }

  Future<void> publishMatch(String matchId) {
    return _apiClient.post<void>(
      '/matches/$matchId/publish',
      authenticated: true,
      parser: (_) {},
    );
  }

  Future<void> unpublishMatch(String matchId) {
    return _apiClient.patch<void>(
      '/matches/$matchId',
      authenticated: true,
      body: {'status': 'DRAFT'},
      parser: (_) {},
    );
  }
}

