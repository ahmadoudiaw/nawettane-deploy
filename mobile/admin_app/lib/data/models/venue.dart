class Venue {
  Venue({
    required this.id,
    required this.name,
    this.address,
  });

  final String id;
  final String name;
  final String? address;

  factory Venue.fromJson(Map<String, dynamic> json) {
    return Venue(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      address: json['address'] as String?,
    );
  }
}

