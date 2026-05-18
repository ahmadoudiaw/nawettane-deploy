import 'package:flutter/material.dart';

import '../../../app.dart';
import '../../../core/offline/offline_bootstrap_service.dart';
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
            const _OfflinePreparationCard(),
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

// ── Offline preparation card ──────────────────────────────────────────────────

class _OfflinePreparationCard extends StatefulWidget {
  const _OfflinePreparationCard();

  @override
  State<_OfflinePreparationCard> createState() => _OfflinePreparationCardState();
}

class _OfflinePreparationCardState extends State<_OfflinePreparationCard> {
  OfflineBootstrapStatus? _status;
  bool _loading = false;
  String? _error;
  OfflineBootstrapResult? _lastResult;
  bool _initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      _initialized = true;
      _loadStatus();
    }
  }

  Future<void> _loadStatus() async {
    final status =
        await AgentAppScope.of(context).offlineBootstrapService.getStatus();
    if (mounted) setState(() => _status = status);
  }

  Future<void> _prepare() async {
    setState(() {
      _loading = true;
      _error = null;
      _lastResult = null;
    });
    try {
      final result =
          await AgentAppScope.of(context).offlineBootstrapService.prepare();
      if (!mounted) return;
      setState(() {
        _loading = false;
        _lastResult = result;
      });
      await _loadStatus();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  String _formatDate(DateTime dt) {
    final now = DateTime.now();
    final isToday =
        dt.year == now.year && dt.month == now.month && dt.day == now.day;
    final hm =
        '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    return isToday
        ? "aujourd'hui à $hm"
        : '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')} à $hm';
  }

  @override
  Widget build(BuildContext context) {
    final status = _status;
    final colors = Theme.of(context).colorScheme;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.offline_bolt_outlined, color: colors.primary),
                const SizedBox(width: 8),
                Text(
                  'Mode hors ligne',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ],
            ),
            const SizedBox(height: 14),
            if (status == null)
              const _StatusRow(
                icon: Icons.hourglass_empty,
                label: 'Chargement…',
              )
            else ...[
              _StatusRow(
                icon: Icons.sports_soccer,
                label: 'Matchs en cache : ${status.matchesCached}',
              ),
              const SizedBox(height: 4),
              _StatusRow(
                icon: Icons.confirmation_number_outlined,
                label: 'Tickets en cache : ${status.ticketsCached}',
              ),
              const SizedBox(height: 4),
              _StatusRow(
                icon: Icons.pending_outlined,
                label: 'Scans en attente : ${status.pendingScans}',
              ),
              const SizedBox(height: 10),
              Text(
                status.isPrepared
                    ? 'Dernière préparation : ${_formatDate(status.lastPreparedAt!)}'
                    : 'Jamais préparé',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
            if (_lastResult != null) ...[
              const SizedBox(height: 10),
              _FeedbackBanner(
                color: Colors.green,
                backgroundColor: Colors.green.shade50,
                icon: Icons.check_circle_outline,
                message:
                    'Mode hors ligne prêt — ${_lastResult!.matchesCached} match(s), ${_lastResult!.ticketsCached} ticket(s) en cache',
              ),
              if (_lastResult!.ticketFetchErrors > 0) ...[
                const SizedBox(height: 6),
                _FeedbackBanner(
                  color: Colors.orange,
                  backgroundColor: Colors.orange.shade50,
                  icon: Icons.warning_amber_outlined,
                  message:
                      '${_lastResult!.ticketFetchErrors} match(s) : tickets non récupérés (vérifiez votre connexion)',
                ),
              ],
            ],
            if (_error != null) ...[
              const SizedBox(height: 10),
              _FeedbackBanner(
                color: Colors.red,
                backgroundColor: Colors.red.shade50,
                icon: Icons.error_outline,
                message: _error!,
              ),
            ],
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _loading ? null : _prepare,
                icon: _loading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.cloud_download_outlined),
                label: Text(
                  _loading ? 'Préparation…' : 'Préparer le mode hors ligne',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusRow extends StatelessWidget {
  const _StatusRow({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final subtle = Theme.of(context).colorScheme.onSurfaceVariant;
    return Row(
      children: [
        Icon(icon, size: 15, color: subtle),
        const SizedBox(width: 6),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}

class _FeedbackBanner extends StatelessWidget {
  const _FeedbackBanner({
    required this.color,
    required this.backgroundColor,
    required this.icon,
    required this.message,
  });

  final Color color;
  final Color backgroundColor;
  final IconData icon;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: TextStyle(color: color, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}
