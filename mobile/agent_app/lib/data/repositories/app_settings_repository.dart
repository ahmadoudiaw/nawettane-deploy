import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../core/config/app_config.dart';
import '../models/app_settings.dart';

class AppSettingsRepository {
  Future<AppSettingsModel> getSettings() async {
    try {
      final response = await http
          .get(Uri.parse('${AppConfig.apiBaseUrl}/public/app-settings'))
          .timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        return AppSettingsModel.fromJson(json);
      }
    } catch (_) {}
    return AppSettingsModel.defaults;
  }
}
