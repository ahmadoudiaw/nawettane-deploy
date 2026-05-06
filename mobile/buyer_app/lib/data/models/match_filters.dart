class MatchFilters {
  const MatchFilters({
    this.q,
    this.departmentId,
    this.zoneId,
    this.seasonId,
    this.fromDate,
  });

  final String? q;
  final String? departmentId;
  final String? zoneId;
  final String? seasonId;
  final DateTime? fromDate;

  MatchFilters copyWith({
    String? q,
    String? departmentId,
    String? zoneId,
    String? seasonId,
    DateTime? fromDate,
    bool clearDate = false,
  }) {
    return MatchFilters(
      q: q ?? this.q,
      departmentId: departmentId ?? this.departmentId,
      zoneId: zoneId ?? this.zoneId,
      seasonId: seasonId ?? this.seasonId,
      fromDate: clearDate ? null : fromDate ?? this.fromDate,
    );
  }

  MatchFilters cleared() => const MatchFilters();

  Map<String, String> toQuery() {
    return {
      if (q != null && q!.trim().isNotEmpty) 'q': q!.trim(),
      if (departmentId != null && departmentId!.isNotEmpty) 'departmentId': departmentId!,
      if (zoneId != null && zoneId!.isNotEmpty) 'zoneId': zoneId!,
      if (seasonId != null && seasonId!.isNotEmpty) 'seasonId': seasonId!,
      if (fromDate != null) 'fromDate': fromDate!.toIso8601String(),
    };
  }
}

