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
  final _phoneController = TextEditingController();
  bool _recoveryExpanded = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _controller ??= TicketWalletController(BuyerAppScope.of(context).ticketWalletRepository)
      ..load();
  }

  @override
  void dispose() {
    _controller?.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _recover() async {
    final phone = _phoneController.text.trim();
    if (phone.isEmpty) return;
    FocusScope.of(context).unfocus();
    await _controller?.recoverByPhone(phone);
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
          final recoverySection = _buildRecoverySection(context, controller);

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
                else if (controller.tickets.isEmpty) ...[
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
                  ),
                  const SizedBox(height: 16),
                  recoverySection,
                ] else ...[
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
                  const SizedBox(height: 8),
                  recoverySection,
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildRecoverySection(BuildContext context, TicketWalletController controller) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            InkWell(
              borderRadius: BorderRadius.circular(8),
              onTap: () => setState(() => _recoveryExpanded = !_recoveryExpanded),
              child: Row(
                children: [
                  const Icon(Icons.phone_android, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Récupérer mes billets par téléphone',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                    ),
                  ),
                  Icon(_recoveryExpanded ? Icons.expand_less : Icons.expand_more),
                ],
              ),
            ),
            if (_recoveryExpanded) ...[
              const SizedBox(height: 14),
              Text(
                'Entrez le numéro utilisé lors de l\'achat pour retrouver vos billets sur ce téléphone.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Numéro de téléphone',
                  hintText: 'ex: 77 123 45 67',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.phone),
                  isDense: true,
                ),
                onSubmitted: (_) => _recover(),
              ),
              const SizedBox(height: 10),
              if (controller.recoveryError != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    controller.recoveryError!,
                    style: const TextStyle(color: Colors.red, fontSize: 13),
                  ),
                ),
              if (controller.recoveryCount != null && !controller.isRecovering)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    controller.recoveryCount == 0
                        ? 'Aucun billet trouvé pour ce numéro.'
                        : '${controller.recoveryCount} billet(s) récupéré(s) avec succès.',
                    style: TextStyle(
                      color: controller.recoveryCount == 0 ? Colors.orange : Colors.green,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: controller.isRecovering ? null : _recover,
                  icon: controller.isRecovering
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.search),
                  label: Text(controller.isRecovering ? 'Recherche...' : 'Récupérer'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
