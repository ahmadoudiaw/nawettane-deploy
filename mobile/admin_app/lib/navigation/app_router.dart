import 'package:flutter/material.dart';

import '../data/models/match.dart';
import '../presentation/screens/auth/login_screen.dart';
import '../presentation/screens/dashboard/admin_shell.dart';
import '../presentation/screens/matches/match_quick_detail_screen.dart';
import '../presentation/screens/splash/splash_screen.dart';

class AppRouter {
  static const splash = '/';
  static const login = '/login';
  static const shell = '/shell';
  static const matchDetail = '/match-detail';

  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    debugPrint('[ROUTER] route received: ${settings.name}');
    switch (settings.name) {
      case splash:
        return MaterialPageRoute(builder: (_) => const SplashScreen());
      case login:
        return MaterialPageRoute(builder: (_) => const LoginScreen());
      case shell:
        return MaterialPageRoute(builder: (_) => const AdminShell());
      case matchDetail:
        debugPrint('[ROUTER] args type: ${settings.arguments?.runtimeType}');
        final match = settings.arguments! as MatchModel;
        return MaterialPageRoute<bool>(builder: (_) => MatchQuickDetailScreen(match: match));
      default:
        return MaterialPageRoute(
          builder: (_) => const Scaffold(
            body: Center(child: Text('Écran mobile introuvable.')),
          ),
        );
    }
  }
}
