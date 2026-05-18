import 'package:flutter/foundation.dart';

import '../../data/models/scan_history_entry.dart';
import '../../data/models/scan_result.dart';
import '../../data/repositories/scan_repository.dart';

class ScanSessionController extends ChangeNotifier {
  ScanSessionController(this._repository, {required this.matchId}) {
    _loadServerStats();
  }

  final ScanRepository _repository;
  final String matchId;

  bool isSubmitting = false;
  bool isLoadingStats = false;
  String? error;
  ScanValidationResponse? lastResponse;
  int validCount = 0;
  int usedCount = 0;
  int invalidCount = 0;
  int outOfScopeCount = 0;
  int pendingOfflineScans = 0;

  final List<ScanHistoryEntry> history = [];

  Future<void> _loadServerStats() async {
    isLoadingStats = true;
    notifyListeners();
    try {
      debugPrint('[SCAN_STATS] GET /scan/my-stats/$matchId');
      final stats = await _repository.fetchMyStats(matchId: matchId);
      validCount = stats.valid;
      usedCount = stats.alreadyUsed;
      invalidCount = stats.invalid;
      outOfScopeCount = stats.outOfScope;
      debugPrint(
        '[SCAN_STATS] valid=${stats.valid} alreadyUsed=${stats.alreadyUsed} '
        'invalid=${stats.invalid} outOfScope=${stats.outOfScope}',
      );
    } catch (e) {
      debugPrint('[SCAN_STATS] erreur chargement stats: $e');
    } finally {
      isLoadingStats = false;
      notifyListeners();
    }
  }

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

      // Incrément optimiste immédiat pour retour visuel instantané
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

    // Synchronisation avec le serveur après chaque scan (sans bloquer l'UI)
    _loadServerStats();
  }

  /// Records an offline scan result in the controller state.
  /// Does NOT call the API. Called only when the device is offline.
  void recordOfflineResult({
    required String ticketCode,
    required String matchLabel,
    required ScanValidationResponse response,
  }) {
    lastResponse = response;
    error = null;
    if (response.result == ValidationResult.valid) {
      pendingOfflineScans++;
    }
    _increment(response.result);
    history.add(ScanHistoryEntry(
      ticketCode: ticketCode,
      result: response.result,
      scannedAt: DateTime.now(),
      matchLabel: matchLabel,
    ));
    notifyListeners();
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
