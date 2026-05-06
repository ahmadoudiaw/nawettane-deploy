import 'package:flutter/material.dart';

import '../data/models/match.dart';
import '../presentation/screens/auth/login_screen.dart';
import '../presentation/screens/contact_screen.dart';
import '../presentation/screens/matches/assigned_matches_screen.dart';
import '../presentation/screens/matches/match_control_screen.dart';
import '../presentation/screens/scan/scan_screen.dart';
import '../presentation/screens/scan/scan_history_screen.dart';
import '../presentation/screens/scan/ticket_counts_screen.dart';
import '../presentation/screens/splash/splash_screen.dart';
import 'scan_route_args.dart';

export 'scan_route_args.dart';

class AppRouter {
  static const splash = '/';
  static const login = '/login';
  static const matches = '/matches';
  static const matchControl = '/match-control';
  static const scan = '/scan';
  static const ticketStats = '/ticket-stats';
  static const scanHistory = '/scan-history';
  static const contact = '/contact';

  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    switch (settings.name) {
      case splash:
        return MaterialPageRoute(builder: (_) => const SplashScreen());
      case login:
        return MaterialPageRoute(builder: (_) => const LoginScreen());
      case matches:
        return MaterialPageRoute(builder: (_) => const AssignedMatchesScreen());
      case matchControl:
        final match = settings.arguments! as MatchModel;
        return MaterialPageRoute(builder: (_) => MatchControlScreen(match: match));
      case scan:
        final args = settings.arguments! as ScanRouteArgs;
        return MaterialPageRoute(builder: (_) => TicketValidationScreen(args: args));
      case ticketStats:
        final args = settings.arguments! as ScanRouteArgs;
        return MaterialPageRoute(builder: (_) => TicketCountsScreen(args: args));
      case scanHistory:
        final args = settings.arguments! as ScanRouteArgs;
        return MaterialPageRoute(builder: (_) => ScanHistoryScreen(args: args));
      case contact:
        return MaterialPageRoute(builder: (_) => const ContactScreen());
      default:
        return MaterialPageRoute(
          builder: (_) => const Scaffold(
            body: Center(child: Text('Écran introuvable.')),
          ),
        );
    }
  }
}
