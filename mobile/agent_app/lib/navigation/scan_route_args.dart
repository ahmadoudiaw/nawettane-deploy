import '../data/models/match.dart';
import '../presentation/controllers/scan_session_controller.dart';

class ScanRouteArgs {
  const ScanRouteArgs({required this.match, required this.controller});

  final MatchModel match;
  final ScanSessionController controller;
}
