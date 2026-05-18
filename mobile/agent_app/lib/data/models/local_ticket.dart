class LocalTicket {
  final String ticketId;
  final String ticketCode;
  final String matchId;
  final bool isUsed;
  final DateTime cachedAt;
  final String? signature;

  LocalTicket({
    required this.ticketId,
    required this.ticketCode,
    required this.matchId,
    required this.isUsed,
    required this.cachedAt,
    this.signature,
  });

  LocalTicket copyWith({bool? isUsed}) {
    return LocalTicket(
      ticketId: ticketId,
      ticketCode: ticketCode,
      matchId: matchId,
      isUsed: isUsed ?? this.isUsed,
      cachedAt: cachedAt,
      signature: signature,
    );
  }

  Map<String, dynamic> toJson() => {
        'ticketId': ticketId,
        'ticketCode': ticketCode,
        'matchId': matchId,
        'isUsed': isUsed,
        'cachedAt': cachedAt.millisecondsSinceEpoch,
        'signature': signature,
      };

  /// Lecture depuis Hive — compatible avec les entrées sans ticketId (Étape 1-3).
  factory LocalTicket.fromJson(Map<String, dynamic> json) => LocalTicket(
        ticketId: json['ticketId'] as String? ?? '',
        ticketCode: json['ticketCode'] as String,
        matchId: json['matchId'] as String,
        isUsed: json['isUsed'] as bool? ?? false,
        cachedAt: DateTime.fromMillisecondsSinceEpoch(json['cachedAt'] as int),
        signature: json['signature'] as String?,
      );

  /// Lecture depuis la réponse de l'endpoint GET /agent/offline/tickets.
  factory LocalTicket.fromOfflineResponse(Map<String, dynamic> json) =>
      LocalTicket(
        ticketId: json['ticketId'] as String,
        ticketCode: json['ticketCode'] as String,
        matchId: json['matchId'] as String,
        isUsed: json['isUsed'] as bool? ?? false,
        cachedAt: DateTime.now(),
        signature: json['signature'] as String?,
      );
}
