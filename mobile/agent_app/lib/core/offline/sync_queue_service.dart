import 'package:hive_flutter/hive_flutter.dart';

import '../../data/models/offline_scan.dart';
import 'offline_storage_service.dart';

class SyncQueueService {
  Box get _box => Hive.box(OfflineStorageService.syncQueueBoxName);

  Future<void> enqueueScan(OfflineScan scan) async {
    await _box.put(scan.id, scan.toJson());
  }

  List<OfflineScan> getPendingScans() {
    return _box.values
        .map((raw) => OfflineScan.fromJson(Map<String, dynamic>.from(raw as Map)))
        .where((s) => s.status == OfflineScanStatus.pending)
        .toList()
      ..sort((a, b) => a.scannedAt.compareTo(b.scannedAt));
  }

  List<OfflineScan> getAllScans() {
    return _box.values
        .map((raw) => OfflineScan.fromJson(Map<String, dynamic>.from(raw as Map)))
        .toList()
      ..sort((a, b) => a.scannedAt.compareTo(b.scannedAt));
  }

  Future<void> markSynced(String scanId) async {
    final raw = _box.get(scanId);
    if (raw == null) return;
    final scan = OfflineScan.fromJson(Map<String, dynamic>.from(raw as Map));
    await _box.put(scanId, scan.copyWith(status: OfflineScanStatus.synced).toJson());
  }

  Future<void> markFailed(String scanId) async {
    final raw = _box.get(scanId);
    if (raw == null) return;
    final scan = OfflineScan.fromJson(Map<String, dynamic>.from(raw as Map));
    await _box.put(scanId, scan.copyWith(status: OfflineScanStatus.failed).toJson());
  }

  Future<void> markConflict(String scanId) async {
    final raw = _box.get(scanId);
    if (raw == null) return;
    final scan = OfflineScan.fromJson(Map<String, dynamic>.from(raw as Map));
    await _box.put(scanId, scan.copyWith(status: OfflineScanStatus.conflict).toJson());
  }

  int get pendingCount => getPendingScans().length;

  Future<void> clearSynced() async {
    final synced = _box.values
        .map((raw) => OfflineScan.fromJson(Map<String, dynamic>.from(raw as Map)))
        .where((s) => s.status == OfflineScanStatus.synced)
        .map((s) => s.id)
        .toList();
    await _box.deleteAll(synced);
  }
}
