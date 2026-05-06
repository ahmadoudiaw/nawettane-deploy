import 'package:flutter/material.dart';

import '../../../app.dart';
import '../../../core/utils/formatters.dart';
import '../../../navigation/app_router.dart';
import '../../controllers/ticket_wallet_controller.dart';

Color _ticketStatusColor(String status) {
  switch (status) {
    case 'GENERATED': return const Color(0xFF2E7D32);
    case 'USED': return const Color(0xFFC62828);
    case 'CANCELLED': return const Color(0xFF757575);
    default: return const Color(0xFF757575);
  }
}

class MyTicketsScreen extends StatefulWidget {
  const MyTicketsScreen({super.key});

  @override
  State<MyTicketsScreen> createState() => _MyTicketsScreenState();
}

class _MyTicketsScreenState extends State<MyTicketsScreen> {
  TicketWalletController? _controller;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _controller ??= TicketWalletController(BuyerAppScope.of(context).ticketWalletRepository)
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
          return RefreshIndicator(
            onRefresh: controller.load,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
              children: [
                Text('Mes billets', style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: 8),
                const Text('Retrouvez ici vos billets achetés depuis ce téléphone.'),
                const SizedBox(height: 20),
                if (controller.isLoading && controller.tickets.isEmpty)
                  const Center(child: Padding(
                    padding: EdgeInsets.all(24),
                    child: CircularProgressIndicator(),
                  ))
                else if (controller.error != null)
                  Text(controller.error!)
                else if (controller.tickets.isEmpty)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Aucun billet enregistré.'),
                          const SizedBox(height: 8),
                          Text(
                            'Après un achat, vos billets apparaîtront ici automatiquement.',
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  ...controller.tickets.map(
                    (ticket) => Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: Card(
                        child: ListTile(
                          onTap: () => Navigator.of(context).pushNamed(
                            AppRouter.ticketDetail,
                            arguments: ticket.id,
                          ),
                          contentPadding: const EdgeInsets.all(18),
                          title: Text(ticket.ticketCode),
                          subtitle: Text(
                            ticket.match == null
                                ? 'Billet Nawettane'
                                : '${ticket.match!.homeTeam.name} vs ${ticket.match!.awayTeam.name}\n${formatDate(ticket.match!.matchDate)}',
                          ),
                          trailing: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                formatTicketStatus(ticket.status),
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: _ticketStatusColor(ticket.status),
                                ),
                              ),
                              if (ticket.ticketCategory != null)
                                Text(
                                  ticket.ticketCategory!.name,
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                            ],
                          ),
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
