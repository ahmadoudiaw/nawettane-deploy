import '../../core/network/api_client.dart';
import '../models/match.dart';

class MatchesRepository {
  MatchesRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<List<MatchModel>> getAssignedMatches() {
    // fromDate=2000-01-01 désactive le filtre automatique "pas de passé" du backend
    // afin de récupérer tous les matchs PUBLISHED (actifs + archivés) en une seule requête.
    return _apiClient.get<List<MatchModel>>(
      '/matches?status=PUBLISHED&fromDate=2000-01-01',
      authenticated: true,
      parser: (json) {
        final items = (json as List<dynamic>? ?? []).whereType<Map<String, dynamic>>();
        return items.map(MatchModel.fromJson).toList();
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

