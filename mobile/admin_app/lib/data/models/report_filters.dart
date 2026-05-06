class ReportFilters {
  const ReportFilters({
    this.reportType = 'zone',
    this.zoneId = '',
    this.week = '',
    this.matchId = '',
  });

  final String reportType;
  final String zoneId;
  final String week;
  final String matchId;

  ReportFilters copyWith({
    String? reportType,
    String? zoneId,
    String? week,
    String? matchId,
  }) {
    return ReportFilters(
      reportType: reportType ?? this.reportType,
      zoneId: zoneId ?? this.zoneId,
      week: week ?? this.week,
      matchId: matchId ?? this.matchId,
    );
  }

  Map<String, String> toQuery() {
    return {
      if (reportType.isNotEmpty) 'reportType': reportType,
      if (zoneId.isNotEmpty) 'zoneId': zoneId,
      if (week.isNotEmpty) 'week': week,
      if (matchId.isNotEmpty) 'matchId': matchId,
    };
  }
}

