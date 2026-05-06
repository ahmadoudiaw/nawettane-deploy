import 'package:flutter/material.dart';

import '../../../app.dart';
import '../../../core/utils/formatters.dart';
import '../../../navigation/app_router.dart';
import '../../controllers/assigned_matches_controller.dart';
import '../../widgets/match_assignment_card.dart';

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

    return Scaffold(
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
              if (!context.mounted) {
                return;
              }
              Navigator.of(context).pushNamedAndRemoveUntil(
                AppRouter.login,
                (route) => false,
              );
            },
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: SafeArea(
        child: AnimatedBuilder(
          animation: controller,
          builder: (context, _) {
            return RefreshIndicator(
              onRefresh: controller.load,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                children: [
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(18),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Bonjour ${authController.session?.user.fullName ?? 'Agent'}',
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
                  if (controller.isLoading && controller.matches.isEmpty)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(24),
                        child: CircularProgressIndicator(),
                      ),
                    )
                  else if (controller.error != null)
                    Text(controller.error!)
                  else if (controller.matches.isEmpty)
                    const Card(
                      child: Padding(
                        padding: EdgeInsets.all(18),
                        child: Text('Aucun match assigné pour le moment.'),
                      ),
                    )
                  else
                    ...controller.matches.map(
                      (match) => Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: MatchAssignmentCard(
                          title: match.label,
                          subtitle:
                              '${match.organization.name} · ${formatMatchDate(match.matchDate)}',
                          venue: match.venue.name,
                          onTap: () => Navigator.of(context).pushNamed(
                            AppRouter.matchControl,
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
      ),
    );
  }
}
