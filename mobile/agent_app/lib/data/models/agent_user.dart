class AgentUser {
  AgentUser({
    required this.id,
    required this.fullName,
    required this.role,
    required this.phone,
    required this.email,
  });

  final String id;
  final String fullName;
  final String role;
  final String phone;
  final String? email;

  bool get isGuichetAgent => role == 'GUICHET_AGENT';

  factory AgentUser.fromJson(Map<String, dynamic> json) {
    return AgentUser(
      id: json['id'] as String? ?? '',
      fullName: json['fullName'] as String? ?? 'Agent',
      role: json['role'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      email: json['email'] as String?,
    );
  }
}

