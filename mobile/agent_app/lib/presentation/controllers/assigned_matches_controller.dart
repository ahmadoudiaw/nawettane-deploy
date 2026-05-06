import 'package:flutter/foundation.dart';

import '../../data/models/match.dart';
import '../../data/repositories/matches_repository.dart';

class AssignedMatchesController extends ChangeNotifier {
  AssignedMatchesController(this._repository);

  final MatchesRepository _repository;

  bool isLoading = false;
  String? error;
  List<MatchModel> matches = [];

  Future<void> load() async {
    isLoading = true;
    error = null;
    notifyListeners();

    try {
      matches = await _repository.getAssignedMatches();
    } catch (exception) {
      error = exception.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }
}

