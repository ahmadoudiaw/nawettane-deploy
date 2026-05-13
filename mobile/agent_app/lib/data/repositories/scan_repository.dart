import '../../core/network/api_client.dart';
import '../models/agent_scan_stats.dart';
import '../models/scan_result.dart';

class ScanRepository {
  ScanRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<ScanValidationResponse> validateTicket({
    required String ticketCode,
    required String matchId,
    String? deviceLabel,
  }) {
    return _apiClient.post<ScanValidationResponse>(
      '/scan/validate',
      authenticated: true,
      body: {
        'ticketCode': ticketCode,
        'matchId': matchId,
        if (deviceLabel != null && deviceLabel.trim().isNotEmpty)
          'deviceLabel': deviceLabel.trim(),
      },
      parser: (json) => ScanValidationResponse.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<AgentScanStats> fetchMyStats({required String matchId}) {
    return _apiClient.get<AgentScanStats>(
      '/scan/my-stats/$matchId',
      authenticated: true,
      parser: (json) => AgentScanStats.fromJson(json as Map<String, dynamic>),
    );
  }
}

