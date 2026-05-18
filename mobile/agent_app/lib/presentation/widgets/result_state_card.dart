import 'package:flutter/material.dart';

import '../../data/models/scan_result.dart';

class ResultStateCard extends StatelessWidget {
  const ResultStateCard({
    super.key,
    required this.result,
    required this.error,
    this.customMessage,
    this.isLoading = false,
  });

  final ValidationResult? result;
  final String? error;
  final String? customMessage;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 22),
        decoration: BoxDecoration(
          color: const Color(0xFFF0F7F4),
          borderRadius: BorderRadius.circular(24),
        ),
        child: const Row(
          children: [
            SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                color: Color(0xFF0D6B3E),
              ),
            ),
            SizedBox(width: 16),
            Text(
              'Validation en cours...',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: Color(0xFF27452F),
              ),
            ),
          ],
        ),
      );
    }

    final resolved = _resolveState(result, error, customMessage);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: resolved.background,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            resolved.title,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w900,
              color: resolved.foreground,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            resolved.message,
            style: TextStyle(
              color: resolved.foreground,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  _StateVisual _resolveState(ValidationResult? result, String? error, String? customMessage) {
    if (error != null) {
      return _StateVisual(
        title: 'ERREUR',
        message: error,
        background: const Color(0xFFF9DFDE),
        foreground: const Color(0xFF9E2B25),
      );
    }

    switch (result) {
      case ValidationResult.valid:
        return _StateVisual(
          title: 'VALIDE',
          message: customMessage ?? 'Billet accepté. Le supporter peut entrer.',
          background: const Color(0xFFDBF4E6),
          foreground: const Color(0xFF0F6C3D),
        );
      case ValidationResult.alreadyUsed:
        return const _StateVisual(
          title: 'DÉJÀ UTILISÉ',
          message: 'Billet déjà utilisé. Refuser l’entrée.',
          background: Color(0xFFFBE7C6),
          foreground: Color(0xFF9A5A0F),
        );
      case ValidationResult.invalid:
        return _StateVisual(
          title: 'INVALIDE',
          message: customMessage ?? 'Billet introuvable ou déjà utilisé.',
          background: const Color(0xFFF8D8D6),
          foreground: const Color(0xFFB4312B),
        );
      case ValidationResult.outOfScope:
        return const _StateVisual(
          title: 'HORS PÉRIMÈTRE',
          message: 'Billet hors périmètre du guichet actuel.',
          background: Color(0xFFE5DDF8),
          foreground: Color(0xFF5D3AA4),
        );
      case null:
        return const _StateVisual(
          title: 'Prêt pour le contrôle',
          message: 'Scannez un QR code ou saisissez un code ticket.',
          background: Color(0xFFE8F0E7),
          foreground: Color(0xFF27452F),
        );
    }
  }
}

class _StateVisual {
  const _StateVisual({
    required this.title,
    required this.message,
    required this.background,
    required this.foreground,
  });

  final String title;
  final String message;
  final Color background;
  final Color foreground;
}
