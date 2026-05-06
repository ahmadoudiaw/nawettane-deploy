import 'package:flutter/material.dart';

import '../../../app.dart';
import '../../../data/models/match_filters.dart';
import '../../../navigation/app_router.dart';
import '../../controllers/matches_controller.dart';
import '../../widgets/match_card.dart';

class MatchesScreen extends StatefulWidget {
  const MatchesScreen({super.key});

  @override
  State<MatchesScreen> createState() => _MatchesScreenState();
}

class _MatchesScreenState extends State<MatchesScreen> {
  MatchesController? _controller;
  final TextEditingController _searchController = TextEditingController();

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _controller ??= MatchesController(BuyerAppScope.of(context).matchesRepository)
      ..load();
  }

  @override
  void dispose() {
    _controller?.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    if (controller == null) {
      return const Scaffold(body: SizedBox.shrink());
    }

    return SafeArea(
      child: AnimatedBuilder(
        animation: controller,
        builder: (context, _) {
          final matches = controller.matches;
          final zones = {
            for (final match in matches) match.organization.id: match.organization.name,
          };
          final seasons = {
            for (final match in matches) match.season.id: match.season.name,
          };

          return RefreshIndicator(
            onRefresh: controller.load,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
              children: [
                Text('Trouver un match', style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: 8),
                const Text(
                  'Recherche par affiche, zone ou saison avec un parcours pensé pour le téléphone.',
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Rechercher une affiche, une équipe, une zone',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: IconButton(
                      onPressed: () async {
                        _searchController.clear();
                        await controller.applyFilters(controller.filters.cleared());
                      },
                      icon: const Icon(Icons.close),
                    ),
                  ),
                  onSubmitted: (value) => controller.applyFilters(
                    controller.filters.copyWith(q: value),
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: (controller.filters.zoneId?.isNotEmpty ?? false)
                      ? controller.filters.zoneId
                      : '',
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Zone'),
                  items: [
                    const DropdownMenuItem<String>(value: '', child: Text('Toutes')),
                    ...zones.entries.map(
                      (entry) => DropdownMenuItem(
                        value: entry.key,
                        child: Text(entry.value, overflow: TextOverflow.ellipsis),
                      ),
                    ),
                  ],
                  onChanged: (value) => controller.applyFilters(
                    controller.filters.copyWith(zoneId: value ?? ''),
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: (controller.filters.seasonId?.isNotEmpty ?? false)
                      ? controller.filters.seasonId
                      : '',
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Saison'),
                  items: [
                    const DropdownMenuItem<String>(value: '', child: Text('Toutes')),
                    ...seasons.entries.map(
                      (entry) => DropdownMenuItem(
                        value: entry.key,
                        child: Text(entry.value, overflow: TextOverflow.ellipsis),
                      ),
                    ),
                  ],
                  onChanged: (value) => controller.applyFilters(
                    controller.filters.copyWith(seasonId: value ?? ''),
                  ),
                ),
                const SizedBox(height: 12),
                FilledButton.tonal(
                  onPressed: () async {
                    final picked = await showDatePicker(
                      context: context,
                      firstDate: DateTime(2024),
                      lastDate: DateTime(2030),
                      initialDate: controller.filters.fromDate ?? DateTime.now(),
                    );

                    if (picked != null) {
                      await controller.applyFilters(
                        controller.filters.copyWith(fromDate: picked),
                      );
                    }
                  },
                  child: Text(
                    controller.filters.fromDate == null
                        ? 'Choisir une date'
                        : 'À partir du ${controller.filters.fromDate!.day}/${controller.filters.fromDate!.month}/${controller.filters.fromDate!.year}',
                  ),
                ),
                TextButton(
                  onPressed: () async {
                    _searchController.clear();
                    await controller.applyFilters(const MatchFilters());
                  },
                  child: const Text('Effacer les filtres'),
                ),
                const SizedBox(height: 12),
                if (controller.isLoading && matches.isEmpty)
                  const Center(child: Padding(
                    padding: EdgeInsets.all(24),
                    child: CircularProgressIndicator(),
                  ))
                else if (controller.error != null)
                  Text(controller.error!)
                else if (matches.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(12),
                    child: Text('Aucun match publié ne correspond à ces filtres.'),
                  )
                else
                  ...matches.map(
                    (match) => Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: MatchCard(
                        match: match,
                        onTap: () => Navigator.of(context).pushNamed(
                          AppRouter.matchDetail,
                          arguments: match,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}
