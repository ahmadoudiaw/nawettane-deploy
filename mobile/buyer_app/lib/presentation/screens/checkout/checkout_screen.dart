import 'package:flutter/material.dart';

import '../../../app.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/match.dart';
import '../../../data/models/match_ticket_category.dart';
import '../../../navigation/app_router.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key, required this.match});

  final MatchModel match;

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  int _quantity = 1;
  String _provider = 'WAVE_MOCK';
  bool _submitting = false;
  String? _error;
  MatchTicketCategory? _selectedCategory;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final selected = _selectedCategory;
    final total = (selected?.price ?? 0) * _quantity;

    return Scaffold(
      appBar: AppBar(title: const Text('Paiement'), leading: const BackButton()),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          Text(
            '${widget.match.homeTeam.name} vs ${widget.match.awayTeam.name}',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 4),
          Text('${widget.match.organization.name} · ${formatDate(widget.match.matchDate)}'),
          const SizedBox(height: 20),
          Text('Choisissez votre catégorie', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 10),
          ...widget.match.ticketCategories.map(
            (category) => _CategoryCard(
              category: category,
              selected: selected?.id == category.id,
              onTap: () => setState(() => _selectedCategory = category),
            ),
          ),
          const SizedBox(height: 16),
          Form(
            key: _formKey,
            child: Column(
              children: [
                TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(
                    labelText: 'Nom complet',
                    prefixIcon: Icon(Icons.person_outline),
                  ),
                  validator: (v) => v == null || v.trim().isEmpty ? 'Champ requis' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: 'Téléphone',
                    prefixIcon: Icon(Icons.phone_outlined),
                  ),
                  validator: (v) => v == null || v.trim().isEmpty ? 'Champ requis' : null,
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<int>(
                  initialValue: _quantity,
                  decoration: const InputDecoration(labelText: 'Quantité'),
                  items: List.generate(
                    5,
                    (i) => DropdownMenuItem(value: i + 1, child: Text('${i + 1}')),
                  ),
                  onChanged: (value) => setState(() => _quantity = value ?? 1),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _provider,
                  decoration: const InputDecoration(labelText: 'Mode de paiement'),
                  items: const [
                    DropdownMenuItem(value: 'WAVE_MOCK', child: Text('Wave')),
                    DropdownMenuItem(value: 'ORANGE_MONEY_MOCK', child: Text('Orange Money')),
                  ],
                  onChanged: (value) => setState(() => _provider = value ?? 'WAVE_MOCK'),
                ),
              ],
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: Colors.red)),
          ],
          if (selected != null) ...[
            const SizedBox(height: 18),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  children: [
                    _SummaryRow(label: 'Catégorie', value: selected.name),
                    _SummaryRow(label: 'Prix unitaire', value: formatCurrency(selected.price)),
                    _SummaryRow(label: 'Quantité', value: '$_quantity'),
                    _SummaryRow(label: 'Total', value: formatCurrency(total), highlight: true),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
      bottomNavigationBar: ColoredBox(
        color: Theme.of(context).colorScheme.surface,
        child: SafeArea(
          minimum: const EdgeInsets.fromLTRB(20, 12, 20, 16),
          child: FilledButton(
            onPressed: selected == null || _submitting ? null : _submit,
            child: Text(_submitting ? 'Traitement...' : 'Confirmer le paiement'),
          ),
        ),
      ),
    );
  }

  Future<void> _submit() async {
    final selected = _selectedCategory;
    if (selected == null) return;
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _submitting = true;
      _error = null;
    });

    final scope = BuyerAppScope.of(context);
    try {
      final order = await scope.checkoutRepository.createOrder(
        matchId: widget.match.id,
        ticketCategoryId: selected.id,
        buyerName: _nameController.text.trim(),
        buyerPhone: _phoneController.text.trim(),
        buyerEmail: '',
        quantity: _quantity,
      );

      final tickets = await scope.checkoutRepository.confirmMockPayment(
        orderId: order.id,
        provider: _provider,
      );

      final ids = tickets.map((ticket) => ticket.id).where((id) => id.isNotEmpty).toList();
      if (ids.isEmpty) {
        throw ApiException(message: 'Aucun billet généré après le paiement.', statusCode: 500);
      }

      await scope.ticketWalletRepository.saveTicketIds(ids);

      if (!mounted) return;

      Navigator.of(context).pushNamedAndRemoveUntil(
        AppRouter.ticketDetail,
        ModalRoute.withName(AppRouter.home),
        arguments: ids.first,
      );
    } catch (exception) {
      setState(() => _error = exception.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }
}

class _CategoryCard extends StatelessWidget {
  const _CategoryCard({
    required this.category,
    required this.selected,
    required this.onTap,
  });

  final MatchTicketCategory category;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    const green = Color(0xFF0D6B3E);
    const greenLight = Color(0xFFEAF5EE);
    const greenText = Color(0xFF0E7A46);
    const grey = Color(0xFF6B7280);
    const border = Color(0xFFDDE3E9);
    const dark = Color(0xFF132218);

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: selected ? greenLight : Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? green : border,
            width: selected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    category.name,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: selected ? green : dark,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(
                        Icons.confirmation_number_outlined,
                        size: 13,
                        color: selected ? greenText : grey,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${category.remaining} places restantes',
                        style: TextStyle(
                          fontSize: 13,
                          color: selected ? greenText : grey,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  formatCurrency(category.price),
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: selected ? green : dark,
                  ),
                ),
                const SizedBox(height: 6),
                Icon(
                  selected ? Icons.check_circle : Icons.radio_button_unchecked,
                  color: selected ? green : border,
                  size: 22,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.label,
    required this.value,
    this.highlight = false,
  });

  final String label;
  final String value;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(
      fontWeight: highlight ? FontWeight.w800 : FontWeight.w600,
      color: highlight ? Theme.of(context).colorScheme.primary : const Color(0xFF132218),
    );

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Expanded(child: Text(label)),
          Text(value, style: style),
        ],
      ),
    );
  }
}
