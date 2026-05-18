import 'package:shared_preferences/shared_preferences.dart';

/// Generates and persists a stable device identifier across app restarts.
/// The ID is created once on first launch and never changes.
class DeviceIdService {
  static const _key = 'offline_device_id';
  static String? _cached;

  static Future<String> getDeviceId() async {
    if (_cached != null) return _cached!;
    final prefs = await SharedPreferences.getInstance();
    var id = prefs.getString(_key);
    if (id == null || id.isEmpty) {
      id = _generate();
      await prefs.setString(_key, id);
    }
    _cached = id;
    return _cached!;
  }

  static String _generate() {
    final ts = DateTime.now().millisecondsSinceEpoch;
    final micro = DateTime.now().microsecond;
    return 'agent-${(ts ^ (micro * 999983)).abs()}';
  }
}
