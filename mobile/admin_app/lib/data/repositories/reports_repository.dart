import '../../core/network/api_client.dart';
import '../models/dashboard_metrics.dart';
import '../models/report_filters.dart';

class ReportsRepository {
  ReportsRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<DashboardMetrics> getDashboard(ReportFilters filters) {
    final query = filters.toQuery().entries
        .map((entry) => '${Uri.encodeQueryComponent(entry.key)}=${Uri.encodeQueryComponent(entry.value)}')
        .join('&');

    return _apiClient.get<DashboardMetrics>(
      '/reports/dashboard${query.isEmpty ? '' : '?$query'}',
      authenticated: true,
      parser: (json) => DashboardMetrics.fromJson(json as Map<String, dynamic>),
    );
  }
}

