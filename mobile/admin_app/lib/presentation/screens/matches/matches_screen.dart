import 'package:flutter/material.dart';

import '../../../app.dart';
import '../../../core/utils/formatters.dart';
import '../../../navigation/app_router.dart';
import '../../../data/models/match.dart';
import '../../controllers/matches_controller.dart';
import '../../widgets/match_tile_card.dart';

// Flip to true to replace MatchTileCard with a bare ListTile for tap diagnosis.
// If ListTile taps work but MatchTileCard does not, the bug is inside the card widget.
const bool _diagListTile = false;

class MatchesScreen extends StatefulWidget {
  const MatchesScreen({super.key});

  @override
  State<MatchesScreen> createState() => _MatchesScreenState();
}

class _MatchesScreenState extends State<MatchesScreen> {
  MatchesController? _controller;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _controller ??= MatchesController(AdminAppScope.of(context).matchesRepository)..load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _controller?.dispose();
    super.dispose();
  }

  List get _filteredMatches {
    final matches = _controller?.matches ?? [];
    if (_searchQuery.isEmpty) return matches;
    final q = _searchQuery.toLowerCase();
    return matches.where((m) {
      return m.homeTeam.name.toLowerCase().contains(q) ||
          m.awayTeam.name.toLowerCase().contains(q) ||
          m.venue.name.toLowerCase().contains(q) ||
          m.organization.name.toLowerCase().contains(q) ||
          m.competitionName.toLowerCase().contains(q) ||
          formatMatchStatus(m.status).toLowerCase().contains(q);
    }).toList();
  }

  void _openMatchDetail(MatchModel match) async {
    debugPrint('[ADMIN_MATCH] open detail called ${match.id}');
    if (!mounted) return;
    try {
      debugPrint('[ADMIN_MATCH] pushing route /match-detail for ${match.id}');
      final result = await Navigator.of(context).pushNamed(
        AppRouter.matchDetail,
        arguments: match,
      );
      final refreshed = result == true;
      debugPrint('[ADMIN_MATCH] returned from route, refreshed: $refreshed');
      if (refreshed && mounted) _controller?.load();
    } catch (e, st) {
      debugPrint('[ADMIN_MATCH] navigation error: $e\n$st');
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    if (controller == null) {
      return const SizedBox.shrink();
    }

    return AnimatedBuilder(
      animation: controller,
      builder: (_, __) {
        debugPrint('[ADMIN_MATCH] build: ${controller.matches.length} matches loaded');
        final filtered = _filteredMatches;

        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 4),
              child: TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Rechercher un match…',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () {
                            _searchController.clear();
                            setState(() => _searchQuery = '');
                          },
                        )
                      : null,
                  border: const OutlineInputBorder(),
                  isDense: true,
                ),
                onChanged: (v) => setState(() => _searchQuery = v),
              ),
            ),
            Expanded(
              child: RefreshIndicator(
                onRefresh: controller.load,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 110),
                  children: [
                    if (controller.isLoading && controller.matches.isEmpty)
                      const Center(
                        child: Padding(
                          padding: EdgeInsets.all(24),
                          child: CircularProgressIndicator(),
                        ),
                      )
                    else if (controller.error != null)
                      Text(controller.error!)
                    else if (filtered.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(24),
                        child: Center(child: Text('Aucun match trouvé.')),
                      )
                    else
                      ...filtered.map(
                        (match) => Padding(
                          padding: const EdgeInsets.only(bottom: 14),
                          child: _diagListTile
                              ? ListTile(
                                  title: Text(match.label),
                                  subtitle: Text(
                                    '${match.organization.name} · ${formatDateTime(match.matchDate)}',
                                  ),
                                  trailing: const Icon(Icons.chevron_right),
                                  onTap: () {
                                    debugPrint('[ADMIN_MATCH] LISTTILE TAP DETECTED ${match.id}');
                                    _openMatchDetail(match);
                                  },
                                )
                              : MatchTileCard(
                                  title: match.label,
                                  subtitle:
                                      '${match.organization.name} · ${formatDateTime(match.matchDate)}',
                                  status: formatMatchStatus(match.status),
                                  onTap: () {
                                    debugPrint('[ADMIN_MATCH] CARD TAP DETECTED ${match.id}');
                                    _openMatchDetail(match);
                                  },
                                ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
