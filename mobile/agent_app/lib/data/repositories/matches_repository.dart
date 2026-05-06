import '../../core/network/api_client.dart';
import '../models/match.dart';

class MatchesRepository {
  MatchesRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<List<MatchModel>> getAssignedMatches() {
    return _apiClient.get<List<MatchModel>>(
      '/matches',
      authenticated: true,
      parser: (json) {
        final items = (json as List<dynamic>? ?? []).whereType<Map<String, dynamic>>();
        return items
            .map(MatchModel.fromJson)
            .where((match) => match.status == 'PUBLISHED')
            .toList();
      },
    );
  }

  Future<MatchModel> getMatch(String id) {
    return _apiClient.get<MatchModel>(
      '/matches/$id',
      authenticated: true,
      parser: (json) => MatchModel.fromJson(json as Map<String, dynamic>),
    );
  }
}

