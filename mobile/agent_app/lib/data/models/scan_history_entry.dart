import 'scan_result.dart';

class ScanHistoryEntry {
  ScanHistoryEntry({
    required this.ticketCode,
    required this.result,
    required this.scannedAt,
    required this.matchLabel,
  });

  final String ticketCode;
  final ValidationResult result;
  final DateTime scannedAt;
  final String matchLabel;
}
