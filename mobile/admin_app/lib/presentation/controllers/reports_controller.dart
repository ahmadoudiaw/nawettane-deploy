import 'package:flutter/foundation.dart';

import '../../data/models/dashboard_metrics.dart';
import '../../data/models/report_filters.dart';
import '../../data/repositories/reports_repository.dart';

class ReportsController extends ChangeNotifier {
  ReportsController(this._repository);

  final ReportsRepository _repository;

  bool isLoading = false;
  String? error;
  DashboardMetrics? metrics;
  ReportFilters filters = const ReportFilters();

  Future<void> load() async {
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      metrics = await _repository.getDashboard(filters);
    } catch (exception) {
      error = exception.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> updateFilters(ReportFilters next) async {
    filters = next;
    await load();
  }
}

