import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'app.dart';
import 'core/offline/connectivity_service.dart';
import 'core/offline/offline_storage_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('fr_FR', null);

  await Hive.initFlutter();
  await Future.wait([
    Hive.openBox(OfflineStorageService.ticketsBoxName),
    Hive.openBox(OfflineStorageService.matchesBoxName),
    Hive.openBox(OfflineStorageService.syncQueueBoxName),
  ]);

  ConnectivityService().startMonitoring();

  runApp(const NawettaneAgentApp());
}

