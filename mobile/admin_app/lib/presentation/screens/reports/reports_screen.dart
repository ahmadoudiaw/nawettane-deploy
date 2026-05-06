import 'package:flutter/material.dart';

import '../../../app.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/report_filters.dart';
import '../../controllers/matches_controller.dart';
import '../../controllers/reports_controller.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  ReportsController? _reportsController;
  MatchesController? _matchesController;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _reportsController ??= ReportsController(AdminAppScope.of(context).reportsRepository)..load();
    _matchesController ??= MatchesController(AdminAppScope.of(context).matchesRepository)..load();
  }

  @override
  void dispose() {
    _reportsController?.dispose();
    _matchesController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reportsController = _reportsController;
    final matchesController = _matchesController;
    if (reportsController == null || matchesController == null) {
      return const SizedBox.shrink();
    }

    return RefreshIndicator(
      onRefresh: () async {
        await matchesController.load();
        await reportsController.load();
      },
      child: AnimatedBuilder(
        animation: Listenable.merge([reportsController, matchesController]),
        builder: (context, _) {
          final matches = matchesController.matches;
          final zones = {
            for (final match in matches) match.organization.id: match.organization.name,
          };
          final metrics = reportsController.metrics;

          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 110),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Filtres', style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: reportsController.filters.reportType,
                        decoration: const InputDecoration(labelText: 'Type de rapport'),
                        items: const [
                          DropdownMenuItem(value: 'match', child: Text('Par match')),
                          DropdownMenuItem(value: 'journee', child: Text('Par journée')),
                          DropdownMenuItem(value: 'poule', child: Text('Par poule')),
                          DropdownMenuItem(value: 'zone', child: Text('Par zone')),
                          DropdownMenuItem(value: 'semaine', child: Text('Par semaine')),
                        ],
                        onChanged: (value) => reportsController.updateFilters(
                          reportsController.filters.copyWith(reportType: value ?? 'zone'),
                        ),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: reportsController.filters.zoneId.isEmpty
                            ? ''
                            : reportsController.filters.zoneId,
                        decoration: const InputDecoration(labelText: 'Zone'),
                        items: [
                          const DropdownMenuItem<String>(value: '', child: Text('Toutes')),
                          ...zones.entries.map(
                            (entry) => DropdownMenuItem(
                              value: entry.key,
                              child: Text(entry.value),
                            ),
                          ),
                        ],
                        onChanged: (value) => reportsController.updateFilters(
                          reportsController.filters.copyWith(zoneId: value ?? ''),
                        ),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: reportsController.filters.matchId.isEmpty
                            ? ''
                            : reportsController.filters.matchId,
                        decoration: const InputDecoration(labelText: 'Match'),
                        items: [
                          const DropdownMenuItem<String>(value: '', child: Text('Tous')),
                          ...matches.map(
                            (match) => DropdownMenuItem(
                              value: match.id,
                              child: Text(match.label),
                            ),
                          ),
                        ],
                        onChanged: (value) => reportsController.updateFilters(
                          reportsController.filters.copyWith(matchId: value ?? ''),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        initialValue: reportsController.filters.week,
                        decoration: const InputDecoration(
                          labelText: 'Semaine',
                          hintText: 'Ex: 2026-W17',
                        ),
                        onFieldSubmitted: (value) => reportsController.updateFilters(
                          reportsController.filters.copyWith(week: value.trim()),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextButton(
                        onPressed: () => reportsController.updateFilters(const ReportFilters()),
                        child: const Text('Effacer les filtres'),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              if (reportsController.error != null)
                Text(reportsController.error!)
              else ...[
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('KPIs', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 12),
                        _MetricLine(label: 'Revenus', value: formatCurrency(metrics?.revenue ?? 0)),
                        _MetricLine(label: 'Matchs', value: '${metrics?.matchesCount ?? 0}'),
                        _MetricLine(label: 'Tickets vendus', value: '${metrics?.ticketsSold ?? 0}'),
                        _MetricLine(label: 'Tickets scannés', value: '${metrics?.ticketsScanned ?? 0}'),
                        _MetricLine(label: 'Tickets non utilisés', value: '${metrics?.ticketsUnused ?? 0}'),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                ...?metrics?.rows.map(
                  (row) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(18),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(row.label, style: Theme.of(context).textTheme.titleMedium),
                            const SizedBox(height: 10),
                            _MetricLine(label: 'Matchs', value: '${row.matchesCount}'),
                            _MetricLine(label: 'Tickets vendus', value: '${row.ticketsSold}'),
                            _MetricLine(label: 'Revenus', value: formatCurrency(row.revenue)),
                            _MetricLine(label: 'Scannés', value: '${row.ticketsScanned}'),
                            _MetricLine(label: 'Non utilisés', value: '${row.ticketsUnused}'),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _MetricLine extends StatelessWidget {
  const _MetricLine({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Expanded(child: Text(label)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}

