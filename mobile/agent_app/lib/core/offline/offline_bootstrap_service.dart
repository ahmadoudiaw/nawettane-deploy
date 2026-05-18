import 'package:shared_preferences/shared_preferences.dart';

import '../../data/models/local_match.dart';
import '../../data/repositories/matches_repository.dart';
import '../../data/repositories/offline_ticket_repository.dart';
import 'connectivity_service.dart';
import 'offline_storage_service.dart';
import 'sync_queue_service.dart';

class OfflineBootstrapService {
  static const _lastPreparedKey = 'offline_last_prepared_at';
  static const _maxCacheAgeHours = 24;

  OfflineBootstrapService({
    required MatchesRepository matchesRepository,
    required OfflineTicketRepository offlineTicketRepository,
    required OfflineStorageService storageService,
    required ConnectivityService connectivityService,
    required SyncQueueService syncQueueService,
  })  : _matchesRepository = matchesRepository,
        _offlineTicketRepository = offlineTicketRepository,
        _storageService = storageService,
        _connectivityService = connectivityService,
        _syncQueueService = syncQueueService;

  final MatchesRepository _matchesRepository;
  final OfflineTicketRepository _offlineTicketRepository;
  final OfflineStorageService _storageService;
  final ConnectivityService _connectivityService;
  final SyncQueueService _syncQueueService;

  /// Returns true if the cache was never prepared or is older than [_maxCacheAgeHours].
  Future<bool> isCacheStale() async {
    final prefs = await SharedPreferences.getInstance();
    final ts = prefs.getInt(_lastPreparedKey);
    if (ts == null) return true;
    final age = DateTime.now().difference(DateTime.fromMillisecondsSinceEpoch(ts));
    return age.inHours >= _maxCacheAgeHours;
  }

  Future<OfflineBootstrapStatus> getStatus() async {
    final prefs = await SharedPreferences.getInstance();
    final ts = prefs.getInt(_lastPreparedKey);
    return OfflineBootstrapStatus(
      lastPreparedAt: ts != null ? DateTime.fromMillisecondsSinceEpoch(ts) : null,
      matchesCached: _storageService.getCachedMatches().length,
      ticketsCached: _storageService.ticketCount,
      pendingScans: _syncQueueService.pendingCount,
    );
  }

  /// Télécharge les matchs actifs assignés et les met en cache dans Hive.
  ///
  /// ⚠️ Étape 3 — mise en cache des tickets :
  /// Nécessite l'endpoint backend : GET /offline/tickets?matchId={id}
  /// Cet endpoint doit retourner la liste des ticketCodes valides pour le match.
  /// Une fois disponible, décommenter la section TODO ci-dessous.
  Future<OfflineBootstrapResult> prepare() async {
    final isOnline = await _connectivityService.checkConnectivity();
    if (!isOnline) {
      throw const OfflineBootstrapException(
        'Pas de connexion réseau. Connectez-vous avant de préparer le mode hors ligne.',
      );
    }

    final matches = await _matchesRepository.getAssignedMatches();
    final activeMatches = matches.where((m) => !m.isPast).toList();
    final localMatches = activeMatches.map(LocalMatch.fromMatchModel).toList();
    await _storageService.cacheMatches(localMatches);

    // Réinitialise le cache tickets avant de recharger depuis le backend.
    await _storageService.clearTickets();
    var ticketFetchErrors = 0;
    for (final match in activeMatches) {
      try {
        final tickets =
            await _offlineTicketRepository.getOfflineTickets(match.id);
        await _storageService.cacheTickets(tickets);
      } catch (_) {
        ticketFetchErrors++;
      }
    }

    final now = DateTime.now();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_lastPreparedKey, now.millisecondsSinceEpoch);

    return OfflineBootstrapResult(
      matchesCached: localMatches.length,
      ticketsCached: _storageService.ticketCount,
      pendingScans: _syncQueueService.pendingCount,
      preparedAt: now,
      ticketFetchErrors: ticketFetchErrors,
    );
  }
}

class OfflineBootstrapStatus {
  const OfflineBootstrapStatus({
    required this.lastPreparedAt,
    required this.matchesCached,
    required this.ticketsCached,
    required this.pendingScans,
  });

  final DateTime? lastPreparedAt;
  final int matchesCached;
  final int ticketsCached;
  final int pendingScans;

  bool get isPrepared => lastPreparedAt != null;
}

class OfflineBootstrapResult {
  const OfflineBootstrapResult({
    required this.matchesCached,
    required this.ticketsCached,
    required this.pendingScans,
    required this.preparedAt,
    this.ticketFetchErrors = 0,
  });

  final int matchesCached;
  final int ticketsCached;
  final int pendingScans;
  final DateTime preparedAt;
  final int ticketFetchErrors;
}

class OfflineBootstrapException implements Exception {
  const OfflineBootstrapException(this.message);
  final String message;

  @override
  String toString() => message;
}
