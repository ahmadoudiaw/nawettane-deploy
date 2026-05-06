class AdminUser {
  AdminUser({
    required this.id,
    required this.fullName,
    required this.role,
    required this.phone,
    this.email,
    this.status = 'ACTIVE',
    this.organizationNames = const [],
  });

  final String id;
  final String fullName;
  final String role;
  final String phone;
  final String? email;
  final String status;
  final List<String> organizationNames;

  bool get isAllowedMobileAdmin {
    const allowedRoles = {
      'SUPER_ADMIN',
      'ONCAV_ADMIN',
      'ORCAV_ADMIN',
      'ODCAV_ADMIN',
      'ZONE_ADMIN',
      'AGENT_MAIRIE',
    };
    return allowedRoles.contains(role);
  }

  factory AdminUser.fromJson(Map<String, dynamic> json) {
    final assignments = (json['organizationAssignments'] as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map((a) {
          final org = a['organization'] as Map<String, dynamic>?;
          return org?['name'] as String? ?? '';
        })
        .where((name) => name.isNotEmpty)
        .toList();

    return AdminUser(
      id: json['id'] as String? ?? '',
      fullName: json['fullName'] as String? ?? 'Admin',
      role: json['role'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      email: json['email'] as String?,
      status: json['status'] as String? ?? 'ACTIVE',
      organizationNames: assignments,
    );
  }
}
