import 'package:flutter/foundation.dart';

import '../../data/models/match.dart';
import '../../data/repositories/matches_repository.dart';

class MatchesController extends ChangeNotifier {
  MatchesController(this._repository);

  final MatchesRepository _repository;

  bool isLoading = false;
  String? error;
  List<MatchModel> matches = [];

  Future<void> load() async {
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      matches = await _repository.getMatches();
    } catch (exception) {
      error = exception.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> togglePublish(MatchModel match) async {
    error = null;
    try {
      if (match.status == 'PUBLISHED') {
        await _repository.unpublishMatch(match.id);
      } else {
        await _repository.publishMatch(match.id);
      }
      await load();
    } catch (exception) {
      error = exception.toString();
      notifyListeners();
    }
  }
}

