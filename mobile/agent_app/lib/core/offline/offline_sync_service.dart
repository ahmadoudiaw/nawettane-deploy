import '../../core/network/api_client.dart';
import 'device_id_service.dart';
import 'sync_queue_service.dart';

class SyncResult {
  final List<String> synced;
  final List<SyncRejected> rejected;
  final List<String> conflicts;

  const SyncResult({
    required this.synced,
    required this.rejected,
    required this.conflicts,
  });
}

class SyncRejected {
  final String localScanId;
  final String reason;

  const SyncRejected({required this.localScanId, required this.reason});
}

class OfflineSyncService {
  OfflineSyncService({
    required ApiClient apiClient,
    required SyncQueueService syncQueueService,
  })  : _apiClient = apiClient,
        _syncQueueService = syncQueueService;

  final ApiClient _apiClient;
  final SyncQueueService _syncQueueService;

  int get pendingCount => _syncQueueService.pendingCount;

  Future<SyncResult> syncPendingScans() async {
    final pending = _syncQueueService.getPendingScans();
    if (pending.isEmpty) {
      return const SyncResult(synced: [], rejected: [], conflicts: []);
    }

    final deviceId = await DeviceIdService.getDeviceId();

    final scansPayload = pending
        .map((s) => {
              'localScanId': s.id,
              'ticketId': s.ticketId,
              'ticketCode': s.ticketCode,
              'matchId': s.matchId,
              'scannedAtLocal': s.scannedAt.toIso8601String(),
            })
        .toList();

    final result = await _apiClient.post<SyncResult>(
      '/agent/offline/sync',
      authenticated: true,
      body: {'deviceId': deviceId, 'scans': scansPayload},
      parser: (json) {
        final data = json as Map<String, dynamic>;
        final syncedIds = List<String>.from(data['synced'] as List? ?? []);
        final rejectedList = (data['rejected'] as List? ?? [])
            .cast<Map<String, dynamic>>()
            .map((r) => SyncRejected(
                  localScanId: r['localScanId'] as String,
                  reason: r['reason'] as String,
                ))
            .toList();
        final conflictIds = List<String>.from(data['conflicts'] as List? ?? []);
        return SyncResult(synced: syncedIds, rejected: rejectedList, conflicts: conflictIds);
      },
    );

    for (final id in result.synced) {
      await _syncQueueService.markSynced(id);
    }
    for (final r in result.rejected) {
      await _syncQueueService.markFailed(r.localScanId);
    }
    for (final id in result.conflicts) {
      await _syncQueueService.markConflict(id);
    }

    return result;
  }
}
