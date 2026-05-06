import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../../data/models/scan_result.dart';
import '../../../navigation/scan_route_args.dart';
import '../../controllers/scan_session_controller.dart';
import '../../widgets/result_state_card.dart';

class TicketValidationScreen extends StatefulWidget {
  const TicketValidationScreen({super.key, required this.args});

  final ScanRouteArgs args;

  @override
  State<TicketValidationScreen> createState() => _TicketValidationScreenState();
}

class _TicketValidationScreenState extends State<TicketValidationScreen> {
  final _ticketCodeController = TextEditingController();
  final _deviceLabelController = TextEditingController(text: 'Mobile agent');
  final _formKey = GlobalKey<FormState>();

  // true while bottom sheet is open OR while API call is in flight
  bool _scanning = false;
  Timer? _autoScanTimer;

  ScanSessionController get _controller => widget.args.controller;

  @override
  void dispose() {
    _autoScanTimer?.cancel();
    _ticketCodeController.dispose();
    _deviceLabelController.dispose();
    super.dispose();
  }

  Future<void> _startScan() async {
    if (_scanning || _controller.isSubmitting) return;
    _autoScanTimer?.cancel();
    setState(() => _scanning = true);

    try {
      final rawQr = await showModalBottomSheet<String>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.black,
        builder: (_) => const _QrScannerSheet(),
      );

      if (rawQr == null || rawQr.isEmpty || !mounted) return;

      debugPrint('[SCAN] QR reçu: $rawQr');

      String ticketCode;
      String? qrMatchId;

      if (rawQr.trimLeft().startsWith('{')) {
        try {
          final map = jsonDecode(rawQr) as Map<String, dynamic>;
          ticketCode = ((map['ticketCode'] as String?) ?? '').trim().toUpperCase();
          qrMatchId = map['matchId'] as String?;
        } catch (_) {
          debugPrint('[SCAN] JSON parse failed — fallback sur valeur brute');
          ticketCode = rawQr.trim().toUpperCase();
        }
      } else {
        ticketCode = rawQr.trim().toUpperCase();
      }

      debugPrint('[SCAN] ticketCode: $ticketCode');
      debugPrint('[SCAN] qrMatchId: $qrMatchId | selectedMatchId: ${widget.args.match.id}');

      if (ticketCode.isEmpty) {
        _controller.setLocalError('QR invalide');
        return;
      }

      if (qrMatchId != null && qrMatchId.isNotEmpty && qrMatchId != widget.args.match.id) {
        _controller.setLocalError('Ce billet ne correspond pas au match sélectionné.');
        return;
      }

      _ticketCodeController.text = ticketCode;
      await _submit();
    } finally {
      if (mounted) setState(() => _scanning = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    await _controller.submit(
      ticketCode: _ticketCodeController.text.trim().toUpperCase(),
      matchId: widget.args.match.id,
      matchLabel: widget.args.match.label,
      deviceLabel: _deviceLabelController.text.trim(),
    );

    if (!mounted) return;

    final result = _controller.lastResponse?.result;
    if (result == ValidationResult.valid) {
      HapticFeedback.mediumImpact();
      _ticketCodeController.clear();
      _scheduleAutoRescan();
    } else if (result != null) {
      // double impact pour signaler le refus
      HapticFeedback.heavyImpact();
      Future.delayed(const Duration(milliseconds: 120), HapticFeedback.heavyImpact);
      _ticketCodeController.selection = TextSelection(
        baseOffset: 0,
        extentOffset: _ticketCodeController.text.length,
      );
    }
  }

  void _scheduleAutoRescan() {
    _autoScanTimer = Timer(const Duration(seconds: 2), () {
      if (mounted) _startScan();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Validation ticket')),
      body: SafeArea(
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, _) {
            final busy = _scanning || _controller.isSubmitting;
            return ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.args.match.label,
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 8),
                        Text(widget.args.match.organization.name),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                ResultStateCard(
                  result: _controller.lastResponse?.result,
                  error: _controller.error,
                  isLoading: _controller.isSubmitting,
                ),
                const SizedBox(height: 18),
                SizedBox(
                  height: 56,
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: busy ? null : _startScan,
                    icon: const Icon(Icons.qr_code_scanner, size: 26),
                    label: Text(
                      _controller.isSubmitting
                          ? 'Validation...'
                          : _scanning
                              ? 'Scan en cours...'
                              : 'Scanner un QR code',
                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                const Divider(),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    'Ou saisir manuellement',
                    style: Theme.of(context).textTheme.bodyMedium,
                    textAlign: TextAlign.center,
                  ),
                ),
                Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      TextFormField(
                        controller: _ticketCodeController,
                        textCapitalization: TextCapitalization.characters,
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.2,
                        ),
                        decoration: const InputDecoration(
                          labelText: 'Code ticket',
                          hintText: 'Ex: NWT-ABC-123',
                        ),
                        validator: (value) =>
                            value == null || value.trim().isEmpty ? 'Saisissez un code ticket' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _deviceLabelController,
                        decoration: const InputDecoration(labelText: 'Libellé appareil'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  height: 64,
                  child: FilledButton.icon(
                    onPressed: busy ? null : _submit,
                    icon: const Icon(Icons.check_circle_outline, size: 28),
                    label: Text(
                      _controller.isSubmitting ? 'Validation...' : 'Valider le ticket',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 56,
                  child: OutlinedButton.icon(
                    onPressed: busy
                        ? null
                        : () {
                            _autoScanTimer?.cancel();
                            _ticketCodeController.clear();
                            _controller.resetFeedback();
                          },
                    icon: const Icon(Icons.restart_alt),
                    label: const Text('Réinitialiser'),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

// ─── QR scanner bottom sheet ──────────────────────────────────────────────────

class _QrScannerSheet extends StatefulWidget {
  const _QrScannerSheet();

  @override
  State<_QrScannerSheet> createState() => _QrScannerSheetState();
}

class _QrScannerSheetState extends State<_QrScannerSheet> {
  final MobileScannerController _scannerController = MobileScannerController();
  bool _detected = false;

  @override
  void dispose() {
    _scannerController.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_detected) return;
    final code = capture.barcodes.firstOrNull?.rawValue;
    if (code == null || code.isEmpty) return;

    _detected = true;
    HapticFeedback.mediumImpact(); // feedback immédiat tactile
    setState(() {}); // cadre passe au vert

    // bref délai pour que l'utilisateur voit le flash vert
    Future.delayed(const Duration(milliseconds: 180), () {
      if (mounted) Navigator.of(context).pop(code);
    });
  }

  @override
  Widget build(BuildContext context) {
    final screenHeight = MediaQuery.of(context).size.height;
    return SizedBox(
      height: screenHeight * 0.78,
      child: Column(
        children: [
          AppBar(
            backgroundColor: Colors.black,
            foregroundColor: Colors.white,
            title: const Text('Scanner un ticket'),
            leading: const CloseButton(),
            actions: [
              IconButton(
                icon: const Icon(Icons.flashlight_on),
                onPressed: () => _scannerController.toggleTorch(),
                tooltip: 'Torche',
              ),
            ],
          ),
          Expanded(
            child: Stack(
              alignment: Alignment.center,
              children: [
                MobileScanner(controller: _scannerController, onDetect: _onDetect),
                _ScanFrame(detected: _detected),
              ],
            ),
          ),
          ColoredBox(
            color: Colors.black,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      _detected ? Icons.check_circle : Icons.qr_code_2,
                      size: 18,
                      color: _detected ? const Color(0xFF4ADE80) : Colors.white54,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _detected
                          ? 'QR détecté — validation en cours...'
                          : 'Pointez la caméra vers le QR code du ticket',
                      style: TextStyle(
                        color: _detected ? const Color(0xFF4ADE80) : Colors.white70,
                        fontSize: 14,
                        fontWeight: _detected ? FontWeight.w700 : FontWeight.normal,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Scanner viewfinder with corner brackets ──────────────────────────────────

class _ScanFrame extends StatelessWidget {
  const _ScanFrame({required this.detected});
  final bool detected;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _FramePainter(
        color: detected ? const Color(0xFF4ADE80) : Colors.white,
      ),
      child: const SizedBox(width: 220, height: 220),
    );
  }
}

class _FramePainter extends CustomPainter {
  const _FramePainter({required this.color});
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 3.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    const arm = 28.0;
    final w = size.width;
    final h = size.height;

    // top-left
    canvas.drawLine(Offset.zero, const Offset(arm, 0), paint);
    canvas.drawLine(Offset.zero, const Offset(0, arm), paint);
    // top-right
    canvas.drawLine(Offset(w, 0), Offset(w - arm, 0), paint);
    canvas.drawLine(Offset(w, 0), Offset(w, arm), paint);
    // bottom-left
    canvas.drawLine(Offset(0, h), Offset(arm, h), paint);
    canvas.drawLine(Offset(0, h), Offset(0, h - arm), paint);
    // bottom-right
    canvas.drawLine(Offset(w, h), Offset(w - arm, h), paint);
    canvas.drawLine(Offset(w, h), Offset(w, h - arm), paint);
  }

  @override
  bool shouldRepaint(_FramePainter old) => old.color != color;
}
