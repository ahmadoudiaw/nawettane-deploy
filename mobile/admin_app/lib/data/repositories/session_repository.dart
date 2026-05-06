import 'package:shared_preferences/shared_preferences.dart';

import '../models/admin_user.dart';

class SessionRepository {
  static const _tokenKey = 'admin_access_token';
  static const _userIdKey = 'admin_user_id';
  static const _userNameKey = 'admin_user_name';
  static const _userRoleKey = 'admin_user_role';
  static const _userPhoneKey = 'admin_user_phone';
  static const _userEmailKey = 'admin_user_email';

  Future<void> saveSession({
    required String accessToken,
    required AdminUser user,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, accessToken);
    await prefs.setString(_userIdKey, user.id);
    await prefs.setString(_userNameKey, user.fullName);
    await prefs.setString(_userRoleKey, user.role);
    await prefs.setString(_userPhoneKey, user.phone);
    if (user.email != null) {
      await prefs.setString(_userEmailKey, user.email!);
    } else {
      await prefs.remove(_userEmailKey);
    }
  }

  Future<String?> getAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  Future<AdminUser?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final id = prefs.getString(_userIdKey);
    final name = prefs.getString(_userNameKey);
    final role = prefs.getString(_userRoleKey);
    final phone = prefs.getString(_userPhoneKey);
    if (id == null || name == null || role == null || phone == null) {
      return null;
    }

    return AdminUser(
      id: id,
      fullName: name,
      role: role,
      phone: phone,
      email: prefs.getString(_userEmailKey),
    );
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userIdKey);
    await prefs.remove(_userNameKey);
    await prefs.remove(_userRoleKey);
    await prefs.remove(_userPhoneKey);
    await prefs.remove(_userEmailKey);
  }
}

