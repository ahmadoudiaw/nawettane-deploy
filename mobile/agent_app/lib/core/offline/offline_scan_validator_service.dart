import '../../data/models/offline_scan.dart';
import '../../data/models/scan_result.dart';
import 'offline_storage_service.dart';
import 'sync_queue_service.dart';

/// Validates a ticket scan locally when the device is offline.
/// [validate] is fully synchronous (Hive reads only).
/// [commitScan] is async (Hive writes).
class OfflineScanValidatorService {
  OfflineScanValidatorService({
    required OfflineStorageService storageService,
    required SyncQueueService syncQueueService,
  })  : _storageService = storageService,
        _syncQueueService = syncQueueService;

  final OfflineStorageService _storageService;
  final SyncQueueService _syncQueueService;

  OfflineScanValidatorResult validate({
    required String ticketCode,
    required String matchId,
    String deviceId = '',
  }) {
    // 1. Match must be in the local cache
    final match = _storageService.getMatch(matchId);
    if (match == null) {
      return OfflineScanValidatorResult.rejected(
        "Match non disponible hors ligne. Préparez le mode hors ligne depuis l'accueil.",
      );
    }

    // 2. Match must not be past
    if (match.isPast) {
      return OfflineScanValidatorResult.rejected('Ce match est terminé.');
    }

    // 3. Ticket must be in the local cache
    final ticket = _storageService.getTicket(ticketCode);
    if (ticket == null) {
      return OfflineScanValidatorResult.rejected(
        "Ticket non disponible hors ligne. Préparez le cache depuis l'accueil.",
      );
    }

    // 4. Ticket must not be already marked as used in local cache
    if (ticket.isUsed) {
      return OfflineScanValidatorResult.rejected(
        'Ticket déjà utilisé.',
        alreadyUsed: true,
      );
    }

    // 5. Ticket must not already exist in sync queue (pending or synced)
    final inQueue = _syncQueueService.getAllScans().any(
      (s) =>
          s.ticketCode == ticketCode &&
          s.matchId == matchId &&
          s.status != OfflineScanStatus.failed,
    );
    if (inQueue) {
      return OfflineScanValidatorResult.rejected(
        'Ticket déjà scanné sur cet appareil.',
        alreadyUsed: true,
      );
    }

    final scan = OfflineScan(
      id: '${DateTime.now().microsecondsSinceEpoch}',
      ticketId: ticket.ticketId,
      ticketCode: ticketCode,
      matchId: matchId,
      result: 'VALID',
      scannedAt: DateTime.now(),
      deviceId: deviceId,
    );
    return OfflineScanValidatorResult.accepted(scan);
  }

  /// Commits an accepted offline scan: marks ticket as used locally
  /// and enqueues for later backend synchronisation.
  Future<void> commitScan(OfflineScan scan) async {
    await _storageService.markTicketAsUsed(scan.ticketCode);
    await _syncQueueService.enqueueScan(scan);
  }
}

class OfflineScanValidatorResult {
  const OfflineScanValidatorResult._({
    required this.accepted,
    required this.message,
    this.alreadyUsed = false,
    this.offlineScan,
  });

  final bool accepted;
  final String message;
  final bool alreadyUsed;
  final OfflineScan? offlineScan;

  factory OfflineScanValidatorResult.accepted(OfflineScan scan) =>
      OfflineScanValidatorResult._(
        accepted: true,
        message: 'Ticket accepté hors ligne. Synchronisation en attente.',
        offlineScan: scan,
      );

  factory OfflineScanValidatorResult.rejected(
    String message, {
    bool alreadyUsed = false,
  }) =>
      OfflineScanValidatorResult._(
        accepted: false,
        message: message,
        alreadyUsed: alreadyUsed,
      );

  ValidationResult get validationResult {
    if (accepted) return ValidationResult.valid;
    if (alreadyUsed) return ValidationResult.alreadyUsed;
    return ValidationResult.invalid;
  }
}
