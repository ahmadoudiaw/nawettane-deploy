enum OfflineScanStatus { pending, synced, failed, conflict }

class OfflineScan {
  final String id;
  final String ticketId;
  final String ticketCode;
  final String matchId;
  final String result;
  final DateTime scannedAt;
  final OfflineScanStatus status;
  final String deviceId;

  OfflineScan({
    required this.id,
    required this.ticketId,
    required this.ticketCode,
    required this.matchId,
    required this.result,
    required this.scannedAt,
    this.status = OfflineScanStatus.pending,
    this.deviceId = '',
  });

  OfflineScan copyWith({OfflineScanStatus? status}) => OfflineScan(
        id: id,
        ticketId: ticketId,
        ticketCode: ticketCode,
        matchId: matchId,
        result: result,
        scannedAt: scannedAt,
        status: status ?? this.status,
        deviceId: deviceId,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'ticketId': ticketId,
        'ticketCode': ticketCode,
        'matchId': matchId,
        'result': result,
        'scannedAt': scannedAt.millisecondsSinceEpoch,
        'status': status.name,
        'deviceId': deviceId,
      };

  factory OfflineScan.fromJson(Map<String, dynamic> json) => OfflineScan(
        id: json['id'] as String,
        ticketId: json['ticketId'] as String? ?? '',
        ticketCode: json['ticketCode'] as String,
        matchId: json['matchId'] as String,
        result: json['result'] as String,
        scannedAt: DateTime.fromMillisecondsSinceEpoch(json['scannedAt'] as int),
        status: OfflineScanStatus.values.firstWhere(
          (s) => s.name == (json['status'] as String? ?? 'pending'),
          orElse: () => OfflineScanStatus.pending,
        ),
        deviceId: json['deviceId'] as String? ?? '',
      );
}
