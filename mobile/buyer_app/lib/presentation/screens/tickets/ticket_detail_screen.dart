import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../app.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/ticket.dart';
import '../../../navigation/app_router.dart';

Color _ticketStatusColor(String status) {
  switch (status) {
    case 'GENERATED': return const Color(0xFF2E7D32);
    case 'USED': return const Color(0xFFC62828);
    case 'CANCELLED': return const Color(0xFF757575);
    default: return const Color(0xFF757575);
  }
}

class TicketDetailScreen extends StatefulWidget {
  const TicketDetailScreen({super.key, required this.ticketId});

  final String ticketId;

  @override
  State<TicketDetailScreen> createState() => _TicketDetailScreenState();
}

class _TicketDetailScreenState extends State<TicketDetailScreen> {
  TicketModel? _ticket;
  bool _loading = true;
  String? _error;
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    // BuyerAppScope.of(context) is an InheritedWidget lookup —
    // must not be called here. Deferred to didChangeDependencies().
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      _initialized = true;
      _load();
    }
  }

  Future<void> _load() async {
    try {
      final ticket = await BuyerAppScope.of(context)
          .ticketWalletRepository
          .getTicket(widget.ticketId);
      if (!mounted) {
        return;
      }
      setState(() {
        _ticket = ticket;
        _loading = false;
      });
    } catch (exception) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = exception.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        final navigator = Navigator.of(context);
        if (navigator.canPop()) {
          navigator.pop();
        } else {
          navigator.pushNamedAndRemoveUntil(AppRouter.home, (route) => false);
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Détail du billet'),
          leading: const BackButton(),
        ),
        body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : ListView(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
                  children: [
                    Container(
                      padding: const EdgeInsets.all(22),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(28),
                        gradient: const LinearGradient(
                          colors: [Color(0xFF114C31), Color(0xFF0E7A46)],
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Billet mobile',
                            style: TextStyle(color: Colors.white70),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _ticket!.ticketCode,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 28,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Text(
                            formatTicketStatus(_ticket!.status),
                            style: TextStyle(
                              color: _ticketStatusColor(_ticket!.status),
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _TicketRow(label: 'Supporter', value: _ticket!.holderName ?? 'Supporter'),
                            if (_ticket!.match != null) ...[
                              _TicketRow(
                                label: 'Match',
                                value: '${_ticket!.match!.homeTeam.name} vs ${_ticket!.match!.awayTeam.name}',
                              ),
                              _TicketRow(label: 'Date', value: formatDate(_ticket!.match!.matchDate)),
                              _TicketRow(label: 'Zone', value: _ticket!.match!.organization.name),
                              _TicketRow(label: 'Stade', value: _ticket!.match!.venue.name),
                            ],
                            if (_ticket!.ticketCategory != null)
                              _TicketRow(
                                label: 'Catégorie',
                                value: '${_ticket!.ticketCategory!.name} · ${formatCurrency(_ticket!.ticketCategory!.price)}',
                              ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          children: [
                            QrImageView(
                              data: _ticket!.qrPayload,
                              version: QrVersions.auto,
                              size: 220,
                              backgroundColor: Colors.white,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              _ticket!.ticketCode,
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                letterSpacing: 1.2,
                                fontSize: 15,
                              ),
                            ),
                            const SizedBox(height: 6),
                            const Text(
                              'Présentez ce QR à l\'entrée',
                              style: TextStyle(color: Colors.black54, fontSize: 13),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
      ),
    );
  }
}

class _TicketRow extends StatelessWidget {
  const _TicketRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 92, child: Text(label)),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF132218)),
            ),
          ),
        ],
      ),
    );
  }
}

