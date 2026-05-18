import 'package:hive_flutter/hive_flutter.dart';

import '../../data/models/local_match.dart';
import '../../data/models/local_ticket.dart';

class OfflineStorageService {
  static const ticketsBoxName = 'nawetane_tickets';
  static const matchesBoxName = 'nawetane_matches';
  static const syncQueueBoxName = 'nawetane_sync_queue';

  Box get _ticketsBox => Hive.box(ticketsBoxName);
  Box get _matchesBox => Hive.box(matchesBoxName);

  // ── Tickets ──────────────────────────────────────────────

  Future<void> cacheTicket(LocalTicket ticket) async {
    await _ticketsBox.put(ticket.ticketCode, ticket.toJson());
  }

  Future<void> cacheTickets(List<LocalTicket> tickets) async {
    final entries = {for (final t in tickets) t.ticketCode: t.toJson()};
    await _ticketsBox.putAll(entries);
  }

  LocalTicket? getTicket(String ticketCode) {
    final raw = _ticketsBox.get(ticketCode);
    if (raw == null) return null;
    return LocalTicket.fromJson(Map<String, dynamic>.from(raw as Map));
  }

  Future<void> markTicketAsUsed(String ticketCode) async {
    final ticket = getTicket(ticketCode);
    if (ticket == null) return;
    await cacheTicket(ticket.copyWith(isUsed: true));
  }

  int get ticketCount => _ticketsBox.length;

  Future<void> clearTickets() => _ticketsBox.clear();

  // ── Matches ───────────────────────────────────────────────

  Future<void> cacheMatch(LocalMatch match) async {
    await _matchesBox.put(match.id, match.toJson());
  }

  Future<void> cacheMatches(List<LocalMatch> matches) async {
    final entries = {for (final m in matches) m.id: m.toJson()};
    await _matchesBox.putAll(entries);
  }

  List<LocalMatch> getCachedMatches() {
    return _matchesBox.values
        .map((raw) => LocalMatch.fromJson(Map<String, dynamic>.from(raw as Map)))
        .toList();
  }

  LocalMatch? getMatch(String matchId) {
    final raw = _matchesBox.get(matchId);
    if (raw == null) return null;
    return LocalMatch.fromJson(Map<String, dynamic>.from(raw as Map));
  }

  Future<void> clearMatches() => _matchesBox.clear();
}
