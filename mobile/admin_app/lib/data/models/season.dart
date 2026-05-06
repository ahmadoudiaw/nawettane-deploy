class Season {
  Season({
    required this.id,
    required this.name,
    required this.year,
  });

  final String id;
  final String name;
  final int year;

  factory Season.fromJson(Map<String, dynamic> json) {
    return Season(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      year: json['year'] as int? ?? 0,
    );
  }
}

