import 'package:flutter/foundation.dart';

import '../../data/models/scan_history_entry.dart';
import '../../data/models/scan_result.dart';
import '../../data/repositories/scan_repository.dart';

class ScanSessionController extends ChangeNotifier {
  ScanSessionController(this._repository);

  final ScanRepository _repository;

  bool isSubmitting = false;
  String? error;
  ScanValidationResponse? lastResponse;
  int validCount = 0;
  int usedCount = 0;
  int invalidCount = 0;
  int outOfScopeCount = 0;

  final List<ScanHistoryEntry> history = [];

  Future<void> submit({
    required String ticketCode,
    required String matchId,
    String matchLabel = '',
    String? deviceLabel,
  }) async {
    final detectedAt = DateTime.now();
    isSubmitting = true;
    error = null;
    notifyListeners();

    try {
      debugPrint('[SCAN] détecté à: ${detectedAt.toIso8601String()}');
      debugPrint('[SCAN_API] POST /scan/validate');
      debugPrint('[SCAN_API] ticketCode: $ticketCode');
      debugPrint('[SCAN_API] matchId: $matchId');
      debugPrint('[SCAN_API] deviceLabel: $deviceLabel');

      lastResponse = await _repository.validateTicket(
        ticketCode: ticketCode,
        matchId: matchId,
        deviceLabel: deviceLabel,
      );

      final durationMs = DateTime.now().difference(detectedAt).inMilliseconds;
      debugPrint('[SCAN_API] réponse à: ${DateTime.now().toIso8601String()}');
      debugPrint('[SCAN_API] résultat: ${lastResponse!.result} | durée: ${durationMs}ms');

      _increment(lastResponse!.result);
      history.add(ScanHistoryEntry(
        ticketCode: ticketCode,
        result: lastResponse!.result,
        scannedAt: detectedAt,
        matchLabel: matchLabel,
      ));
    } catch (exception) {
      final durationMs = DateTime.now().difference(detectedAt).inMilliseconds;
      debugPrint('[SCAN_API] erreur après ${durationMs}ms: $exception');
      error = exception.toString();
    } finally {
      isSubmitting = false;
      notifyListeners();
    }
  }

  void setLocalError(String message) {
    error = message;
    lastResponse = null;
    notifyListeners();
  }

  void resetFeedback() {
    error = null;
    lastResponse = null;
    notifyListeners();
  }

  void _increment(ValidationResult result) {
    switch (result) {
      case ValidationResult.valid:
        validCount += 1;
      case ValidationResult.alreadyUsed:
        usedCount += 1;
      case ValidationResult.invalid:
        invalidCount += 1;
      case ValidationResult.outOfScope:
        outOfScopeCount += 1;
    }
  }
}
