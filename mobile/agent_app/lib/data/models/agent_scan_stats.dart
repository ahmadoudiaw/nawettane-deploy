class AgentScanStats {
  const AgentScanStats({
    required this.valid,
    required this.alreadyUsed,
    required this.invalid,
    required this.outOfScope,
  });

  final int valid;
  final int alreadyUsed;
  final int invalid;
  final int outOfScope;

  factory AgentScanStats.fromJson(Map<String, dynamic> json) {
    return AgentScanStats(
      valid: json['valid'] as int? ?? 0,
      alreadyUsed: json['alreadyUsed'] as int? ?? 0,
      invalid: json['invalid'] as int? ?? 0,
      outOfScope: json['outOfScope'] as int? ?? 0,
    );
  }
}
