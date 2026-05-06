import 'package:flutter/material.dart';

import '../../../navigation/scan_route_args.dart';
import '../../widgets/stat_counter_card.dart';

class TicketCountsScreen extends StatelessWidget {
  const TicketCountsScreen({super.key, required this.args});

  final ScanRouteArgs args;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Décompte tickets')),
      body: SafeArea(
        child: AnimatedBuilder(
          animation: args.controller,
          builder: (context, _) {
            final ctrl = args.controller;
            final total =
                ctrl.validCount + ctrl.usedCount + ctrl.invalidCount + ctrl.outOfScopeCount;

            return ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(args.match.label,
                            style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 8),
                        Text(args.match.organization.name),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primary,
                    borderRadius: BorderRadius.circular(22),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Total scanné',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        '$total',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 40,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                GridView.count(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  childAspectRatio: 1.4,
                  children: [
                    StatCounterCard(
                      label: 'Valides',
                      value: ctrl.validCount,
                      color: const Color(0xFF17884C),
                    ),
                    StatCounterCard(
                      label: 'Déjà utilisés',
                      value: ctrl.usedCount,
                      color: const Color(0xFFB56A13),
                    ),
                    StatCounterCard(
                      label: 'Invalides',
                      value: ctrl.invalidCount,
                      color: const Color(0xFFC93D37),
                    ),
                    StatCounterCard(
                      label: 'Hors périmètre',
                      value: ctrl.outOfScopeCount,
                      color: const Color(0xFF5F45B6),
                    ),
                  ],
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
