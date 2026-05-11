import 'package:flutter/material.dart';

import '../data/models/match.dart';
import '../presentation/screens/checkout/checkout_screen.dart';
import '../presentation/screens/contact_screen.dart';
import '../presentation/screens/home/home_shell.dart';
import '../presentation/screens/matches/match_detail_screen.dart';
import '../presentation/screens/splash_screen.dart';
import '../presentation/screens/tickets/ticket_detail_screen.dart';

class AppRouter {
  static const splash = '/';
  static const home = '/home';
  static const matchDetail = '/match-detail';
  static const checkout = '/checkout';
  static const ticketDetail = '/ticket-detail';
  static const contact = '/contact';

  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    switch (settings.name) {
      case splash:
        return MaterialPageRoute(builder: (_) => const SplashScreen());
      case home:
        return MaterialPageRoute(builder: (_) => const HomeShell());
      case matchDetail:
        final match = settings.arguments! as MatchModel;
        return MaterialPageRoute(builder: (_) => MatchDetailScreen(match: match));
      case checkout:
        final match = settings.arguments! as MatchModel;
        return MaterialPageRoute(builder: (_) => CheckoutScreen(match: match));
      case ticketDetail:
        final ticketId = settings.arguments! as String;
        return MaterialPageRoute(builder: (_) => TicketDetailScreen(ticketId: ticketId));
      case contact:
        return MaterialPageRoute(builder: (_) => const ContactScreen());
      default:
        return MaterialPageRoute(
          builder: (_) => const Scaffold(
            body: Center(child: Text('Route mobile introuvable.')),
          ),
        );
    }
  }
}

