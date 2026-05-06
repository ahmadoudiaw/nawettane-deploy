import 'package:flutter/material.dart';

import '../../../app.dart';
import '../../../navigation/app_router.dart';
import '../matches/matches_screen.dart';
import '../reports/reports_screen.dart';
import '../users/users_screen.dart';
import 'dashboard_screen.dart';

class AdminShell extends StatefulWidget {
  const AdminShell({super.key});

  @override
  State<AdminShell> createState() => _AdminShellState();
}

class _AdminShellState extends State<AdminShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final authController = AdminAppScope.of(context).authController;
    final pages = const [
      DashboardScreen(),
      MatchesScreen(),
      ReportsScreen(),
      UsersScreen(),
    ];

    // Prevent Android back button from closing the app on root admin sections.
    // Allow exit only from the Dashboard tab (index 0).
    return PopScope(
      canPop: _index == 0,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        if (_index != 0) setState(() => _index = 0);
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(
            ['Tableau de bord', 'Matchs', 'Rapports', 'Utilisateurs'][_index],
          ),
          actions: [
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.asset(
                  'assets/images/logo.png',
                  width: 36,
                  height: 36,
                  fit: BoxFit.cover,
                ),
              ),
            ),
            const SizedBox(width: 4),
            IconButton(
              onPressed: () async {
                await authController.logout();
                if (!context.mounted) return;
                Navigator.of(context).pushNamedAndRemoveUntil(
                  AppRouter.login,
                  (route) => false,
                );
              },
              icon: const Icon(Icons.logout),
            ),
          ],
        ),
        body: pages[_index],
        bottomNavigationBar: NavigationBar(
          selectedIndex: _index,
          onDestinationSelected: (value) => setState(() => _index = value),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.dashboard_outlined), label: 'Tableau de bord'),
            NavigationDestination(icon: Icon(Icons.stadium_outlined), label: 'Matchs'),
            NavigationDestination(icon: Icon(Icons.assessment_outlined), label: 'Rapports'),
            NavigationDestination(icon: Icon(Icons.people_outlined), label: 'Utilisateurs'),
          ],
        ),
      ),
    );
  }
}
