import 'package:flutter/material.dart';

import '../../../app.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/match.dart';
import '../../../navigation/app_router.dart';
import '../../controllers/scan_session_controller.dart';

class MatchControlScreen extends StatefulWidget {
  const MatchControlScreen({super.key, required this.match});

  final MatchModel match;

  @override
  State<MatchControlScreen> createState() => _MatchControlScreenState();
}

class _MatchControlScreenState extends State<MatchControlScreen> {
  ScanSessionController? _scanController;
  bool _initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      _initialized = true;
      _scanController = ScanSessionController(AgentAppScope.of(context).scanRepository);
    }
  }

  @override
  void dispose() {
    _scanController?.dispose();
    super.dispose();
  }

  ScanRouteArgs get _scanArgs => ScanRouteArgs(
        match: widget.match,
        controller: _scanController!,
      );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Contrôle d\'accès'),
        actions: [
          IconButton(
            icon: const Icon(Icons.history_rounded),
            tooltip: 'Historique des scans',
            onPressed: _scanController == null
                ? null
                : () => Navigator.of(context).pushNamed(
                      AppRouter.scanHistory,
                      arguments: _scanArgs,
                    ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          Text(widget.match.label, style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 8),
          Text('${widget.match.competitionName} · ${widget.match.stage ?? 'Match officiel'}'),
          const SizedBox(height: 18),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  _Info(label: 'Zone', value: widget.match.organization.name),
                  _Info(label: 'Date', value: formatMatchDate(widget.match.matchDate)),
                  _Info(label: 'Stade', value: widget.match.venue.name),
                  _Info(label: 'Adresse', value: widget.match.venue.address ?? 'Non précisée'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 18),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Consignes guichet', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 10),
                  const Text('1. Vérifiez le code présenté par le supporter.'),
                  const Text('2. Validez le billet pour ce match uniquement.'),
                  const Text('3. En cas de refus, annoncez clairement le statut affiché.'),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: ColoredBox(
        color: Theme.of(context).colorScheme.surface,
        child: SafeArea(
          minimum: const EdgeInsets.fromLTRB(20, 12, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                height: 56,
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _scanController == null
                      ? null
                      : () => Navigator.of(context).pushNamed(AppRouter.scan, arguments: _scanArgs),
                  icon: const Icon(Icons.qr_code_scanner),
                  label: const Text(
                    'Validation ticket',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                height: 56,
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _scanController == null
                      ? null
                      : () => Navigator.of(context).pushNamed(AppRouter.ticketStats, arguments: _scanArgs),
                  icon: const Icon(Icons.bar_chart_rounded),
                  label: const Text(
                    'Décompte tickets',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Info extends StatelessWidget {
  const _Info({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 86, child: Text(label)),
          Expanded(
            child: Text(value, style: const TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}
