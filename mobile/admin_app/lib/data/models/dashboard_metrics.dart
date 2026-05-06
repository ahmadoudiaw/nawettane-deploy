class DashboardMetrics {
  DashboardMetrics({
    required this.matchesCount,
    required this.ticketsSold,
    required this.revenue,
    required this.ticketsScanned,
    required this.ticketsUnused,
    required this.rows,
    this.reportType,
  });

  final int matchesCount;
  final int ticketsSold;
  final double revenue;
  final int ticketsScanned;
  final int ticketsUnused;
  final String? reportType;
  final List<DashboardRow> rows;

  factory DashboardMetrics.fromJson(Map<String, dynamic> json) {
    return DashboardMetrics(
      matchesCount: json['matchesCount'] as int? ?? 0,
      ticketsSold: json['ticketsSold'] as int? ?? 0,
      revenue: double.tryParse('${json['revenue'] ?? 0}') ?? 0,
      ticketsScanned: json['ticketsScanned'] as int? ?? 0,
      ticketsUnused: json['ticketsUnused'] as int? ?? 0,
      reportType: json['reportType'] as String?,
      rows: (json['rows'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(DashboardRow.fromJson)
          .toList(),
    );
  }
}

class DashboardRow {
  DashboardRow({
    required this.key,
    required this.label,
    required this.matchesCount,
    required this.ticketsSold,
    required this.revenue,
    required this.ticketsScanned,
    required this.ticketsUnused,
  });

  final String key;
  final String label;
  final int matchesCount;
  final int ticketsSold;
  final double revenue;
  final int ticketsScanned;
  final int ticketsUnused;

  factory DashboardRow.fromJson(Map<String, dynamic> json) {
    return DashboardRow(
      key: json['key'] as String? ?? '',
      label: json['label'] as String? ?? '',
      matchesCount: json['matchesCount'] as int? ?? 0,
      ticketsSold: json['ticketsSold'] as int? ?? 0,
      revenue: double.tryParse('${json['revenue'] ?? 0}') ?? 0,
      ticketsScanned: json['ticketsScanned'] as int? ?? 0,
      ticketsUnused: json['ticketsUnused'] as int? ?? 0,
    );
  }
}

