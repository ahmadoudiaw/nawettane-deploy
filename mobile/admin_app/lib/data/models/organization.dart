class Organization {
  Organization({
    required this.id,
    required this.name,
  });

  final String id;
  final String name;

  factory Organization.fromJson(Map<String, dynamic> json) {
    return Organization(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
    );
  }
}

