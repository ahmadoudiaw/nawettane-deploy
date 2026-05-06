class Venue {
  Venue({
    required this.id,
    required this.name,
    this.address,
    this.capacity,
  });

  final String id;
  final String name;
  final String? address;
  final int? capacity;

  factory Venue.fromJson(Map<String, dynamic> json) {
    return Venue(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      address: json['address'] as String?,
      capacity: json['capacity'] as int?,
    );
  }
}

