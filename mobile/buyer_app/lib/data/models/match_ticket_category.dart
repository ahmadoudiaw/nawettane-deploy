class MatchTicketCategory {
  MatchTicketCategory({
    required this.id,
    required this.name,
    required this.price,
    required this.quota,
    required this.soldCount,
    required this.badgeColor,
  });

  final String id;
  final String name;
  final double price;
  final int quota;
  final int soldCount;
  final String badgeColor;

  int get remaining => quota - soldCount;

  factory MatchTicketCategory.fromJson(Map<String, dynamic> json) {
    return MatchTicketCategory(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      price: double.tryParse('${json['price'] ?? 0}') ?? 0,
      quota: json['quota'] as int? ?? 0,
      soldCount: json['soldCount'] as int? ?? 0,
      badgeColor: json['badgeColor'] as String? ?? '#0E7A46',
    );
  }
}

