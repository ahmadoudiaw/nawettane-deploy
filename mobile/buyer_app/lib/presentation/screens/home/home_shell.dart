import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../navigation/app_router.dart';
import '../matches/matches_screen.dart';
import '../tickets/my_tickets_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final pages = const [
      MatchesScreen(),
      MyTicketsScreen(),
    ];

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) SystemNavigator.pop();
      },
      child: Scaffold(
        appBar: AppBar(
          toolbarHeight: 64,
          title: const Text('NAWETTANE'),
          actions: [
            IconButton(
              icon: const Icon(Icons.info_outline),
              tooltip: 'Contact',
              onPressed: () => Navigator.of(context).pushNamed(AppRouter.contact),
            ),
            const Padding(
              padding: EdgeInsets.only(right: 16),
              child: Center(
                child: ClipRRect(
                  borderRadius: BorderRadius.all(Radius.circular(10)),
                  child: Image(
                    image: AssetImage('assets/images/logo.png'),
                    width: 40,
                    height: 40,
                    fit: BoxFit.cover,
                  ),
                ),
              ),
            ),
          ],
        ),
        body: IndexedStack(index: _index, children: pages),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _index,
          onDestinationSelected: (value) => setState(() => _index = value),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.confirmation_num_outlined), label: 'Matchs'),
            NavigationDestination(icon: Icon(Icons.qr_code_2_outlined), label: 'Mes billets'),
          ],
        ),
      ),
    );
  }
}
