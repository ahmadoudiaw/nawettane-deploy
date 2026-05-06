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
    required this.season,
    required this.organization,
    required this.venue,
    required this.homeTeam,
    required this.awayTeam,
    this.stage,
  });

  final String id;
  final String competitionName;
  final DateTime matchDate;
  final String status;
  final Season season;
  final Organization organization;
  final Venue venue;
  final Team homeTeam;
  final Team awayTeam;
  final String? stage;

  String get label => '${homeTeam.name} vs ${awayTeam.name}';

  factory MatchModel.fromJson(Map<String, dynamic> json) {
    return MatchModel(
      id: json['id'] as String? ?? '',
      competitionName: json['competitionName'] as String? ?? '',
      matchDate: DateTime.tryParse(json['matchDate'] as String? ?? '') ?? DateTime.now(),
      status: json['status'] as String? ?? '',
      season: Season.fromJson(json['season'] as Map<String, dynamic>? ?? {}),
      organization: Organization.fromJson(json['organization'] as Map<String, dynamic>? ?? {}),
      venue: Venue.fromJson(json['venue'] as Map<String, dynamic>? ?? {}),
      homeTeam: Team.fromJson(json['homeTeam'] as Map<String, dynamic>? ?? {}),
      awayTeam: Team.fromJson(json['awayTeam'] as Map<String, dynamic>? ?? {}),
      stage: json['stage'] as String?,
    );
  }
}

