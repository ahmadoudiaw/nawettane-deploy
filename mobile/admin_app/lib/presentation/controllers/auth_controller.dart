import 'package:flutter/foundation.dart';

import '../../data/models/login_response.dart';
import '../../data/repositories/auth_repository.dart';

class AuthController extends ChangeNotifier {
  AuthController(this._repository);

  final AuthRepository _repository;

  LoginResponse? session;
  bool isLoading = false;
  String? error;

  bool get isAuthenticated => session != null;

  Future<void> bootstrap() async {
    isLoading = true;
    notifyListeners();
    session = await _repository.restoreSession();
    isLoading = false;
    notifyListeners();
  }

  Future<bool> login({
    required String identifier,
    required String password,
  }) async {
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      session = await _repository.login(
        identifier: identifier,
        password: password,
      );
      return true;
    } catch (exception) {
      error = exception.toString();
      return false;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    session = null;
    notifyListeners();
  }
}

