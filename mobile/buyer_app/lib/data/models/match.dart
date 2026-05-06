import 'match_ticket_category.dart';
import 'organization.dart';
import 'season.dart';
import 'team.dart';
import 'venue.dart';

class MatchModel {
  MatchModel({
    required this.id,
    required this.competitionName,
    required this.matchDate,
    required this.status,
    required this.ticketPrice,
    required this.ticketQuota,
    required this.organization,
    required this.season,
    required this.venue,
    required this.homeTeam,
    required this.awayTeam,
    required this.ticketCategories,
    this.stage,
  });

  final String id;
  final String competitionName;
  final String? stage;
  final DateTime matchDate;
  final String status;
  final double ticketPrice;
  final int ticketQuota;
  final Organization organization;
  final Season season;
  final Venue venue;
  final Team homeTeam;
  final Team awayTeam;
  final List<MatchTicketCategory> ticketCategories;

  factory MatchModel.fromJson(Map<String, dynamic> json) {
    final categories = (json['ticketCategories'] as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(MatchTicketCategory.fromJson)
        .toList();
    final fallbackCategory = MatchTicketCategory(
      id: '${json['id'] ?? 'match'}-default',
      name: 'Standard',
      price: double.tryParse('${json['ticketPrice'] ?? 0}') ?? 0,
      quota: json['ticketQuota'] as int? ?? 0,
      soldCount: 0,
      badgeColor: '#0E7A46',
    );

    return MatchModel(
      id: json['id'] as String? ?? '',
      competitionName: json['competitionName'] as String? ?? '',
      stage: json['stage'] as String?,
      matchDate: DateTime.tryParse(json['matchDate'] as String? ?? '') ?? DateTime.now(),
      status: json['status'] as String? ?? 'DRAFT',
      ticketPrice: double.tryParse('${json['ticketPrice'] ?? 0}') ?? 0,
      ticketQuota: json['ticketQuota'] as int? ?? 0,
      organization: Organization.fromJson(json['organization'] as Map<String, dynamic>? ?? {}),
      season: Season.fromJson(json['season'] as Map<String, dynamic>? ?? {}),
      venue: Venue.fromJson(json['venue'] as Map<String, dynamic>? ?? {}),
      homeTeam: Team.fromJson(json['homeTeam'] as Map<String, dynamic>? ?? {}),
      awayTeam: Team.fromJson(json['awayTeam'] as Map<String, dynamic>? ?? {}),
      ticketCategories: categories.isEmpty ? [fallbackCategory] : categories,
    );
  }
}
