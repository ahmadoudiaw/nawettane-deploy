import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../data/models/scan_history_entry.dart';
import '../../../data/models/scan_result.dart';
import '../../../navigation/scan_route_args.dart';

final _timeFormat = DateFormat('HH:mm:ss', 'fr_FR');

class ScanHistoryScreen extends StatelessWidget {
  const ScanHistoryScreen({super.key, required this.args});

  final ScanRouteArgs args;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Historique'),
        leading: const BackButton(),
      ),
      body: AnimatedBuilder(
        animation: args.controller,
        builder: (context, _) {
          final entries = args.controller.history.reversed.toList();

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _MatchHeader(args: args, total: entries.length),
              if (entries.isEmpty)
                const Expanded(child: _EmptyState())
              else
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                    itemCount: entries.length,
                    itemBuilder: (context, i) => _HistoryCard(entry: entries[i]),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

// ─── Header ──────────────────────────────────────────────────────────────────

class _MatchHeader extends StatelessWidget {
  const _MatchHeader({required this.args, required this.total});

  final ScanRouteArgs args;
  final int total;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Theme.of(context).colorScheme.surfaceContainerLow,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    args.match.label,
                    style: Theme.of(context)
                        .textTheme
                        .titleSmall
                        ?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    args.match.organization.name,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '$total scan${total != 1 ? 's' : ''}',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onPrimaryContainer,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Empty state ──────────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.qr_code_scanner, size: 72, color: Colors.grey.shade300),
          const SizedBox(height: 20),
          Text(
            'Aucun scan effectué',
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(color: Colors.grey.shade500),
          ),
          const SizedBox(height: 8),
          Text(
            'Les tickets scannés apparaîtront ici.',
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(color: Colors.grey.shade400),
          ),
        ],
      ),
    );
  }
}

// ─── History card ─────────────────────────────────────────────────────────────

class _HistoryCard extends StatelessWidget {
  const _HistoryCard({required this.entry});

  final ScanHistoryEntry entry;

  @override
  Widget build(BuildContext context) {
    final style = _styleForResult(entry.result);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border(
          left: BorderSide(color: style.color, width: 4),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(
                  child: Text(
                    entry.ticketCode,
                    style: const TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.8,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 10),
                _ResultBadge(style: style),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Icon(Icons.schedule, size: 13, color: Colors.grey.shade500),
                const SizedBox(width: 4),
                Text(
                  _timeFormat.format(entry.scannedAt),
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
                const SizedBox(width: 12),
                Icon(Icons.sports_soccer, size: 13, color: Colors.grey.shade500),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    entry.matchLabel,
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Result badge ─────────────────────────────────────────────────────────────

class _ResultBadge extends StatelessWidget {
  const _ResultBadge({required this.style});

  final _ResultStyle style;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: style.color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(style.icon, size: 12, color: style.color),
          const SizedBox(width: 5),
          Text(
            style.label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: style.color,
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Style helpers ────────────────────────────────────────────────────────────

class _ResultStyle {
  const _ResultStyle({
    required this.color,
    required this.label,
    required this.icon,
  });

  final Color color;
  final String label;
  final IconData icon;
}

_ResultStyle _styleForResult(ValidationResult result) {
  return switch (result) {
    ValidationResult.valid => const _ResultStyle(
        color: Color(0xFF0F6C3D),
        label: 'VALIDE',
        icon: Icons.check_circle,
      ),
    ValidationResult.alreadyUsed => const _ResultStyle(
        color: Color(0xFF9A5A0F),
        label: 'DÉJÀ UTILISÉ',
        icon: Icons.replay_circle_filled,
      ),
    ValidationResult.invalid => const _ResultStyle(
        color: Color(0xFFB4312B),
        label: 'INVALIDE',
        icon: Icons.cancel,
      ),
    ValidationResult.outOfScope => const _ResultStyle(
        color: Color(0xFF5D3AA4),
        label: 'HORS PÉRIMÈTRE',
        icon: Icons.block,
      ),
  };
}
