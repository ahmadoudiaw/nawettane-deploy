import 'package:flutter/material.dart';

import '../../../app.dart';
import '../../../core/utils/formatters.dart';
import '../../../navigation/app_router.dart';
import '../../controllers/assigned_matches_controller.dart';
import '../../widgets/match_assignment_card.dart';
import '../../../data/models/match.dart';

class AssignedMatchesScreen extends StatefulWidget {
  const AssignedMatchesScreen({super.key});

  @override
  State<AssignedMatchesScreen> createState() => _AssignedMatchesScreenState();
}

class _AssignedMatchesScreenState extends State<AssignedMatchesScreen> {
  AssignedMatchesController? _controller;
  bool _initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      _initialized = true;
      _controller = AssignedMatchesController(AgentAppScope.of(context).matchesRepository)
        ..load();
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    final authController = AgentAppScope.of(context).authController;
    if (controller == null) {
      return const Scaffold(body: SizedBox.shrink());
    }

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Matchs assignés'),
          actions: [
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.asset(
                  'assets/images/logo.png',
                  width: 36,
                  height: 36,
                  fit: BoxFit.cover,
                ),
              ),
            ),
            const SizedBox(width: 4),
            IconButton(
              icon: const Icon(Icons.info_outline),
              tooltip: 'Contact',
              onPressed: () => Navigator.of(context).pushNamed(AppRouter.contact),
            ),
            IconButton(
              onPressed: () async {
                await authController.logout();
                if (!context.mounted) return;
                Navigator.of(context).pushNamedAndRemoveUntil(
                  AppRouter.login,
                  (route) => false,
                );
              },
              icon: const Icon(Icons.logout),
            ),
          ],
          bottom: const TabBar(
            tabs: [
              Tab(icon: Icon(Icons.sports_soccer), text: 'Actifs'),
              Tab(icon: Icon(Icons.history), text: 'Historique'),
            ],
          ),
        ),
        body: SafeArea(
          child: AnimatedBuilder(
            animation: controller,
            builder: (context, _) {
              return TabBarView(
                children: [
                  _MatchTab(
                    controller: controller,
                    matches: controller.activeMatches,
                    greeting: 'Bonjour ${authController.session?.user.fullName ?? 'Agent'}',
                    emptyMessage: 'Aucun match actif pour le moment.',
                    onMatchTap: (match) => Navigator.of(context).pushNamed(
                      AppRouter.matchControl,
                      arguments: match,
                    ),
                  ),
                  _MatchTab(
                    controller: controller,
                    matches: controller.archivedMatches,
                    greeting: null,
                    emptyMessage: 'Aucun match archivé.',
                    onMatchTap: (match) => Navigator.of(context).pushNamed(
                      AppRouter.matchControl,
                      arguments: match,
                    ),
                    isPastTab: true,
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _MatchTab extends StatelessWidget {
  const _MatchTab({
    required this.controller,
    required this.matches,
    required this.greeting,
    required this.emptyMessage,
    required this.onMatchTap,
    this.isPastTab = false,
  });

  final AssignedMatchesController controller;
  final List<MatchModel> matches;
  final String? greeting;
  final String emptyMessage;
  final void Function(MatchModel) onMatchTap;
  final bool isPastTab;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: controller.load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          if (greeting != null) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      greeting!,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Vous voyez uniquement les matchs autorisés pour votre guichet.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],
          if (controller.isLoading && matches.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: CircularProgressIndicator(),
              ),
            )
          else if (controller.error != null)
            Text(controller.error!)
          else if (matches.isEmpty)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Text(emptyMessage),
              ),
            )
          else
            ...matches.map(
              (match) => Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: MatchAssignmentCard(
                  title: match.label,
                  subtitle: '${match.organization.name} · ${formatMatchDate(match.matchDate)}',
                  venue: match.venue.name,
                  isPast: isPastTab,
                  onTap: () => onMatchTap(match),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
