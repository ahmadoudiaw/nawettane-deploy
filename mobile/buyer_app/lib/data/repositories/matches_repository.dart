import '../models/match.dart';
import '../models/match_filters.dart';
import '../../core/network/api_client.dart';

class MatchesRepository {
  MatchesRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<List<MatchModel>> getMatches(MatchFilters filters) {
    final query = filters.toQuery();
    final queryString = query.entries.map((e) => '${Uri.encodeQueryComponent(e.key)}=${Uri.encodeQueryComponent(e.value)}').join('&');
    return _apiClient.get<List<MatchModel>>(
      '/matches${queryString.isEmpty ? '' : '?$queryString'}',
      authenticated: true,
      parser: (json) {
        final items = (json as List<dynamic>? ?? []).whereType<Map<String, dynamic>>();
        final today = DateTime.now();
        final startOfToday = DateTime(today.year, today.month, today.day);
        return items
            .map(MatchModel.fromJson)
            .where((match) => match.status == 'PUBLISHED')
            .where((match) => !match.matchDate.isBefore(startOfToday))
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

