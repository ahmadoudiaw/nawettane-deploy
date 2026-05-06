import 'package:flutter/foundation.dart';

import '../../data/models/match.dart';
import '../../data/models/match_filters.dart';
import '../../data/repositories/matches_repository.dart';

class MatchesController extends ChangeNotifier {
  MatchesController(this._repository);

  final MatchesRepository _repository;

  bool isLoading = false;
  String? error;
  List<MatchModel> matches = [];
  MatchFilters filters = const MatchFilters();

  Future<void> load() async {
    isLoading = true;
    error = null;
    notifyListeners();

    try {
      matches = await _repository.getMatches(filters);
    } catch (exception) {
      error = exception.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> applyFilters(MatchFilters nextFilters) async {
    filters = nextFilters;
    await load();
  }
}

