class Organization {
  Organization({
    required this.id,
    required this.name,
    this.departmentId,
    this.communeId,
  });

  final String id;
  final String name;
  final String? departmentId;
  final String? communeId;

  factory Organization.fromJson(Map<String, dynamic> json) {
    return Organization(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      departmentId: json['departmentId'] as String?,
      communeId: json['communeId'] as String?,
    );
  }
}

