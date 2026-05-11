import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app.dart';
import '../../../navigation/app_router.dart';

/// Écran affiché après redirection vers Wave.
/// Ouvre automatiquement l'URL Wave dans le navigateur, puis
/// interroge le statut de la commande jusqu'à confirmation du paiement.
class WavePaymentScreen extends StatefulWidget {
  const WavePaymentScreen({
    super.key,
    required this.orderId,
    required this.waveLaunchUrl,
  });

  final String orderId;
  final String waveLaunchUrl;

  @override
  State<WavePaymentScreen> createState() => _WavePaymentScreenState();
}

class _WavePaymentScreenState extends State<WavePaymentScreen> {
  static const _maxAttempts = 20;
  static const _pollInterval = Duration(seconds: 3);

  _ScreenState _state = _ScreenState.opening;
  String? _error;
  int _attempts = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _openWaveAndStartPolling();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _openWaveAndStartPolling() async {
    // Ouvrir l'URL Wave dans le navigateur externe
    final uri = Uri.parse(widget.waveLaunchUrl);
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      // Si l'ouverture échoue, on reste sur l'écran et on laisse l'utilisateur réessayer
    }

    if (!mounted) return;
    setState(() => _state = _ScreenState.polling);
    _startPolling();
  }

  void _startPolling() {
    _timer?.cancel();
    _attempts = 0;
    _timer = Timer.periodic(_pollInterval, (_) => _checkStatus());
  }

  Future<void> _checkStatus() async {
    if (!mounted) return;
    _attempts++;

    try {
      final scope = BuyerAppScope.of(context);
      final result = await scope.checkoutRepository.getOrderStatus(widget.orderId);

      if (!mounted) return;

      if (result.isPaid) {
        _timer?.cancel();
        setState(() => _state = _ScreenState.confirmed);

        // Sauvegarder et afficher les tickets
        final ids = result.tickets
            .map((t) => t.id)
            .where((id) => id.isNotEmpty)
            .toList();

        if (ids.isNotEmpty) {
          await scope.ticketWalletRepository.saveTicketIds(ids);
          if (!mounted) return;
          Navigator.of(context).pushNamedAndRemoveUntil(
            AppRouter.ticketDetail,
            ModalRoute.withName(AppRouter.home),
            arguments: ids.first,
          );
        } else {
          setState(() {
            _state = _ScreenState.error;
            _error = 'Paiement confirmé mais aucun billet trouvé. Contactez le support.';
          });
        }
        return;
      }

      if (_attempts >= _maxAttempts) {
        _timer?.cancel();
        setState(() {
          _state = _ScreenState.timeout;
        });
      }
    } catch (e) {
      if (!mounted) return;
      if (_attempts >= _maxAttempts) {
        _timer?.cancel();
        setState(() {
          _state = _ScreenState.error;
          _error = e.toString();
        });
      }
      // Sinon on continue à poller
    }
  }

  Future<void> _retryOpen() async {
    setState(() { _state = _ScreenState.opening; _error = null; });
    final uri = Uri.parse(widget.waveLaunchUrl);
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {}
    if (!mounted) return;
    setState(() => _state = _ScreenState.polling);
    _startPolling();
  }

  Future<void> _manualCheck() async {
    setState(() => _state = _ScreenState.polling);
    _startPolling();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _state == _ScreenState.error || _state == _ScreenState.timeout,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Paiement Wave'),
          automaticallyImplyLeading:
              _state == _ScreenState.error || _state == _ScreenState.timeout,
        ),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Center(child: _buildBody()),
          ),
        ),
      ),
    );
  }

  Widget _buildBody() {
    switch (_state) {
      case _ScreenState.opening:
        return _StatusCard(
          icon: '🔗',
          title: 'Ouverture Wave…',
          subtitle: 'Redirection vers le paiement Wave en cours.',
          child: const CircularProgressIndicator(),
        );

      case _ScreenState.polling:
        return _StatusCard(
          icon: '⏳',
          title: 'En attente de confirmation',
          subtitle:
              'Complétez votre paiement dans Wave puis revenez sur cette page. '
              'La confirmation est automatique.',
          child: Column(
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: 24),
              OutlinedButton.icon(
                onPressed: _retryOpen,
                icon: const Icon(Icons.open_in_browser),
                label: const Text('Rouvrir Wave'),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: _manualCheck,
                child: const Text('Vérifier manuellement'),
              ),
            ],
          ),
        );

      case _ScreenState.confirmed:
        return const _StatusCard(
          icon: '✅',
          title: 'Paiement confirmé !',
          subtitle: 'Vos billets ont été générés. Redirection en cours…',
          child: CircularProgressIndicator(),
        );

      case _ScreenState.timeout:
        return _StatusCard(
          icon: '⏱️',
          title: 'Confirmation en attente',
          subtitle:
              'Votre paiement Wave n\'a pas encore été confirmé. '
              'Si vous avez payé, vos billets apparaîtront dans "Mes Tickets" '
              'dès la confirmation de Wave.',
          child: Column(
            children: [
              FilledButton(
                onPressed: _manualCheck,
                child: const Text('Vérifier à nouveau'),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => Navigator.of(context)
                    .pushNamedAndRemoveUntil(AppRouter.home, (_) => false),
                child: const Text('Retour à l\'accueil'),
              ),
            ],
          ),
        );

      case _ScreenState.error:
        return _StatusCard(
          icon: '❌',
          title: 'Erreur',
          subtitle: _error ?? 'Une erreur inattendue s\'est produite.',
          child: Column(
            children: [
              FilledButton(
                onPressed: _retryOpen,
                child: const Text('Réessayer'),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => Navigator.of(context)
                    .pushNamedAndRemoveUntil(AppRouter.home, (_) => false),
                child: const Text('Retour à l\'accueil'),
              ),
            ],
          ),
        );
    }
  }
}

enum _ScreenState { opening, polling, confirmed, timeout, error }

class _StatusCard extends StatelessWidget {
  const _StatusCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.child,
  });

  final String icon;
  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(icon, style: const TextStyle(fontSize: 64)),
        const SizedBox(height: 20),
        Text(
          title,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 12),
        Text(
          subtitle,
          textAlign: TextAlign.center,
          style: const TextStyle(color: Color(0xFF6B7280), height: 1.5),
        ),
        const SizedBox(height: 32),
        child,
      ],
    );
  }
}
