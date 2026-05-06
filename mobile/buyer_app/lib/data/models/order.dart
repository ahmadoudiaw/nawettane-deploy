import 'match.dart';
import 'match_ticket_category.dart';

class OrderModel {
  OrderModel({
    required this.id,
    required this.reference,
    required this.quantity,
    required this.totalAmount,
    this.match,
    this.ticketCategory,
    this.ticketIds = const [],
  });

  final String id;
  final String reference;
  final int quantity;
  final double totalAmount;
  final MatchModel? match;
  final MatchTicketCategory? ticketCategory;
  final List<String> ticketIds;

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    final tickets = (json['tickets'] as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map((ticket) => ticket['id'] as String? ?? '')
        .where((id) => id.isNotEmpty)
        .toList();

    return OrderModel(
      id: json['id'] as String? ?? '',
      reference: json['reference'] as String? ?? '',
      quantity: json['quantity'] as int? ?? 1,
      totalAmount: double.tryParse('${json['totalAmount'] ?? 0}') ?? 0,
      match: json['match'] is Map<String, dynamic>
          ? MatchModel.fromJson(json['match'] as Map<String, dynamic>)
          : null,
      ticketCategory: json['ticketCategory'] is Map<String, dynamic>
          ? MatchTicketCategory.fromJson(json['ticketCategory'] as Map<String, dynamic>)
          : null,
      ticketIds: tickets,
    );
  }
}

