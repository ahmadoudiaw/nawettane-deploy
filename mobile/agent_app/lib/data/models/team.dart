class Team {
  Team({
    required this.id,
    required this.name,
  });

  final String id;
  final String name;

  factory Team.fromJson(Map<String, dynamic> json) {
    return Team(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
    );
  }
}

