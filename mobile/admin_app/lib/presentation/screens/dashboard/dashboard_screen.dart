import 'package:flutter/material.dart';

import '../../../app.dart';
import '../../../core/utils/formatters.dart';
import '../../controllers/auth_controller.dart';
import '../../controllers/matches_controller.dart';
import '../../controllers/reports_controller.dart';
import '../../widgets/kpi_card.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  MatchesController? _matchesController;
  ReportsController? _reportsController;
  AuthController? _authController;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _matchesController ??= MatchesController(AdminAppScope.of(context).matchesRepository)..load();
    _reportsController ??= ReportsController(AdminAppScope.of(context).reportsRepository)..load();
    _authController ??= AdminAppScope.of(context).authController;
  }

  @override
  void dispose() {
    _matchesController?.dispose();
    _reportsController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final matchesController = _matchesController;
    final reportsController = _reportsController;
    final authController = _authController;
    if (matchesController == null || reportsController == null || authController == null) {
      return const SizedBox.shrink();
    }

    return RefreshIndicator(
      onRefresh: () async {
        await matchesController.load();
        await reportsController.load();
      },
      child: AnimatedBuilder(
        animation: Listenable.merge([matchesController, reportsController, authController]),
        builder: (context, _) {
          final metrics = reportsController.metrics;
          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 110),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Bonjour ${authController.session?.user.fullName ?? 'Admin'}',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Suivi mobile ${authController.session?.user.role ?? ''} pour le périmètre visible de votre compte.',
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              GridView.count(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                childAspectRatio: 1.28,
                children: [
                  KpiCard(label: 'Matchs', value: '${metrics?.matchesCount ?? 0}', tone: const Color(0xFF0D5C8B)),
                  KpiCard(label: 'Tickets vendus', value: '${metrics?.ticketsSold ?? 0}', tone: const Color(0xFF0D6B3E)),
                  KpiCard(label: 'Revenus', value: formatCurrency(metrics?.revenue ?? 0), tone: const Color(0xFFE4B136)),
                  KpiCard(label: 'Scannés', value: '${metrics?.ticketsScanned ?? 0}', tone: const Color(0xFF6D4DD4)),
                ],
              ),
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Résumé rapide', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 12),
                      _MiniLine(label: 'Tickets non utilisés', value: '${metrics?.ticketsUnused ?? 0}'),
                      _MiniLine(label: 'Matchs visibles', value: '${matchesController.matches.length}'),
                      _MiniLine(label: 'Type de rapport', value: metrics?.reportType ?? 'zone'),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _MiniLine extends StatelessWidget {
  const _MiniLine({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Expanded(child: Text(label)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}

