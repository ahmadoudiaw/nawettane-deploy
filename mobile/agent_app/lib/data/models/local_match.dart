import 'match.dart';

class LocalMatch {
  final String id;
  final String homeTeamName;
  final String awayTeamName;
  final DateTime matchDate;
  final String status;
  final String competitionName;
  final String venueName;
  final DateTime cachedAt;

  LocalMatch({
    required this.id,
    required this.homeTeamName,
    required this.awayTeamName,
    required this.matchDate,
    required this.status,
    required this.competitionName,
    required this.venueName,
    required this.cachedAt,
  });

  String get label => '$homeTeamName vs $awayTeamName';

  bool get isPast {
    final endOfDay = DateTime(matchDate.year, matchDate.month, matchDate.day, 23, 59, 59);
    return DateTime.now().isAfter(endOfDay);
  }

  factory LocalMatch.fromMatchModel(MatchModel match) => LocalMatch(
        id: match.id,
        homeTeamName: match.homeTeam.name,
        awayTeamName: match.awayTeam.name,
        matchDate: match.matchDate,
        status: match.status,
        competitionName: match.competitionName,
        venueName: match.venue.name,
        cachedAt: DateTime.now(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'homeTeamName': homeTeamName,
        'awayTeamName': awayTeamName,
        'matchDate': matchDate.millisecondsSinceEpoch,
        'status': status,
        'competitionName': competitionName,
        'venueName': venueName,
        'cachedAt': cachedAt.millisecondsSinceEpoch,
      };

  factory LocalMatch.fromJson(Map<String, dynamic> json) => LocalMatch(
        id: json['id'] as String,
        homeTeamName: json['homeTeamName'] as String,
        awayTeamName: json['awayTeamName'] as String,
        matchDate: DateTime.fromMillisecondsSinceEpoch(json['matchDate'] as int),
        status: json['status'] as String,
        competitionName: json['competitionName'] as String,
        venueName: json['venueName'] as String,
        cachedAt: DateTime.fromMillisecondsSinceEpoch(json['cachedAt'] as int),
      );
}
