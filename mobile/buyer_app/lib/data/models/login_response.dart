class LoginResponse {
  LoginResponse({
    required this.accessToken,
  });

  final String accessToken;

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      accessToken: json['accessToken'] as String? ?? '',
    );
  }
}

