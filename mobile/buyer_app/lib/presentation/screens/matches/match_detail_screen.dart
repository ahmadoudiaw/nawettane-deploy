import 'package:flutter/material.dart';

import '../../../core/utils/formatters.dart';
import '../../../data/models/match.dart';
import '../../../navigation/app_router.dart';

class MatchDetailScreen extends StatelessWidget {
  const MatchDetailScreen({super.key, required this.match});

  final MatchModel match;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(leading: const BackButton()),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          Text(
            '${match.homeTeam.name} vs ${match.awayTeam.name}',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 8),
          Text('${match.competitionName} · ${match.stage ?? 'Rencontre officielle'}'),
          const SizedBox(height: 18),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _InfoRow(label: 'Zone', value: match.organization.name),
                  _InfoRow(label: 'Date', value: formatDate(match.matchDate)),
                  _InfoRow(label: 'Stade', value: match.venue.name),
                  _InfoRow(label: 'Adresse', value: match.venue.address ?? 'Non précisée'),
                  _InfoRow(label: 'Saison', value: match.season.name),
                ],
              ),
            ),
          ),
          const SizedBox(height: 18),
          Text('Catégories de billets', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 10),
          ...match.ticketCategories.map(
            (category) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              color: Color(_parseColor(category.badgeColor)),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              category.name,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                          ),
                          Text(
                            formatCurrency(category.price),
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text('${category.remaining} places restantes sur ${category.quota}'),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: ColoredBox(
        color: Theme.of(context).colorScheme.surface,
        child: SafeArea(
          minimum: const EdgeInsets.fromLTRB(20, 12, 20, 16),
          child: FilledButton(
            onPressed: () => Navigator.of(context).pushNamed(
              AppRouter.checkout,
              arguments: match,
            ),
            child: const Text('Choisir une catégorie'),
          ),
        ),
      ),
    );
  }

  int _parseColor(String value) {
    final normalized = value.replaceFirst('#', '');
    return int.parse('FF$normalized', radix: 16);
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 84, child: Text(label)),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF132218)),
            ),
          ),
        ],
      ),
    );
  }
}

