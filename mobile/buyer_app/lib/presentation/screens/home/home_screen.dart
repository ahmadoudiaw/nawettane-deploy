import 'package:flutter/material.dart';

import '../../../app.dart';
import '../../../core/utils/formatters.dart';
import '../../../navigation/app_router.dart';
import '../../controllers/matches_controller.dart';
import '../../widgets/match_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  MatchesController? _controller;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _controller ??= MatchesController(BuyerAppScope.of(context).matchesRepository)
      ..load();
  }

  @override
  void dispose() {
    _controller?.dispose();
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
          final featured = controller.matches.take(3).toList();
          return RefreshIndicator(
            onRefresh: controller.load,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
              children: [
                Container(
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(30),
                    gradient: const LinearGradient(
                      colors: [Color(0xFF114C31), Color(0xFF0E7A46), Color(0xFFF3B319)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                  ),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Billetterie Nawettane',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 28,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      SizedBox(height: 10),
                      Text(
                        'Choisissez votre affiche, payez avec Wave ou Orange Money et conservez vos billets dans votre téléphone.',
                        style: TextStyle(color: Color(0xFFF8F6EE), height: 1.45),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    _QuickMetric(
                      label: 'Matchs',
                      value: '${controller.matches.length}',
                    ),
                    const SizedBox(width: 12),
                    _QuickMetric(
                      label: 'Billets',
                      value: 'Mobile',
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Text('À la une', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 12),
                if (controller.isLoading && featured.isEmpty)
                  const Center(child: Padding(
                    padding: EdgeInsets.all(24),
                    child: CircularProgressIndicator(),
                  ))
                else if (controller.error != null)
                  Text(controller.error!)
                else
                  ...featured.map((match) => Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: MatchCard(
                          match: match,
                          subtitle:
                              '${match.organization.name} · ${formatDate(match.matchDate)}',
                          onTap: () => Navigator.of(context).pushNamed(
                            AppRouter.matchDetail,
                            arguments: match,
                          ),
                        ),
                      )),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _QuickMetric extends StatelessWidget {
  const _QuickMetric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: Theme.of(context).textTheme.bodyMedium),
              const SizedBox(height: 10),
              Text(
                value,
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
