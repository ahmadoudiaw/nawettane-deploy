import 'admin_user.dart';

class LoginResponse {
  LoginResponse({
    required this.accessToken,
    required this.user,
  });

  final String accessToken;
  final AdminUser user;

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      accessToken: json['accessToken'] as String? ?? '',
      user: AdminUser.fromJson(json['user'] as Map<String, dynamic>? ?? {}),
    );
  }
}

