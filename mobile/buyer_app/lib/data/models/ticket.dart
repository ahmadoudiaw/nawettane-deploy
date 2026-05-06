import 'match.dart';
import 'match_ticket_category.dart';

class TicketModel {
  TicketModel({
    required this.id,
    required this.ticketCode,
    required this.qrPayload,
    required this.status,
    required this.createdAt,
    this.holderName,
    this.usedAt,
    this.match,
    this.ticketCategory,
  });

  final String id;
  final String ticketCode;
  final String qrPayload;
  final String status;
  final DateTime createdAt;
  final String? holderName;
  final DateTime? usedAt;
  final MatchModel? match;
  final MatchTicketCategory? ticketCategory;

  factory TicketModel.fromJson(Map<String, dynamic> json) {
    return TicketModel(
      id: json['id'] as String? ?? '',
      ticketCode: json['ticketCode'] as String? ?? '',
      qrPayload: json['qrPayload'] as String? ?? '',
      status: json['status'] as String? ?? 'CREATED',
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
      holderName: json['holderName'] as String?,
      usedAt: DateTime.tryParse(json['usedAt'] as String? ?? ''),
      match: json['match'] is Map<String, dynamic>
          ? MatchModel.fromJson(json['match'] as Map<String, dynamic>)
          : null,
      ticketCategory: json['ticketCategory'] is Map<String, dynamic>
          ? MatchTicketCategory.fromJson(json['ticketCategory'] as Map<String, dynamic>)
          : null,
    );
  }
}

