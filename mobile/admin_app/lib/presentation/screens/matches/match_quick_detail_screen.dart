import 'package:flutter/material.dart';

import '../../../app.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/match.dart';

class MatchQuickDetailScreen extends StatefulWidget {
  const MatchQuickDetailScreen({super.key, required this.match});

  final MatchModel match;

  @override
  State<MatchQuickDetailScreen> createState() => _MatchQuickDetailScreenState();
}

class _MatchQuickDetailScreenState extends State<MatchQuickDetailScreen> {
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    debugPrint('[MATCH_DETAIL] initState: ${widget.match.id}');
  }

  Future<void> _togglePublish() async {
    final repo = AdminAppScope.of(context).matchesRepository;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      if (widget.match.status == 'PUBLISHED') {
        await repo.unpublishMatch(widget.match.id);
      } else {
        await repo.publishMatch(widget.match.id);
      }
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    debugPrint('[MATCH_DETAIL] build ${widget.match.id}');
    final match = widget.match;
    final isPublished = match.status == 'PUBLISHED';

    return Scaffold(
      appBar: AppBar(
        title: Text('${match.homeTeam.name} vs ${match.awayTeam.name}'),
        leading: BackButton(onPressed: () => Navigator.of(context).pop(false)),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          Text(match.label, style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 8),
          Text('${match.competitionName} · ${match.stage ?? 'Match officiel'}'),
          const SizedBox(height: 18),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  _Line(label: 'Zone', value: match.organization.name),
                  _Line(label: 'Stade', value: match.venue.name),
                  _Line(label: 'Adresse', value: match.venue.address ?? 'Non précisée'),
                  _Line(label: 'Date', value: formatDateTime(match.matchDate)),
                  _Line(label: 'Saison', value: match.season.name),
                  _Line(label: 'Statut', value: formatMatchStatus(match.status)),
                ],
              ),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: Colors.red)),
          ],
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _loading ? null : _togglePublish,
            child: _loading
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : Text(isPublished ? 'Dépublier' : 'Publier'),
          ),
        ],
      ),
    );
  }
}

class _Line extends StatelessWidget {
  const _Line({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 92, child: Text(label)),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}
