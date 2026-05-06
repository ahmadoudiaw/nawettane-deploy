import 'package:flutter/foundation.dart';

import '../../data/models/admin_user.dart';
import '../../data/repositories/users_repository.dart';

class UsersController extends ChangeNotifier {
  UsersController(this._repository);

  final UsersRepository _repository;

  bool isLoading = false;
  String? error;
  List<AdminUser> _users = [];
  String query = '';

  List<AdminUser> get filtered {
    final q = query.toLowerCase().trim();
    if (q.isEmpty) return _users;
    return _users.where((u) {
      return [
        u.fullName,
        u.phone,
        u.email ?? '',
        u.role,
        u.status,
        u.organizationNames.join(' '),
      ].join(' ').toLowerCase().contains(q);
    }).toList();
  }

  int get total => _users.length;

  Future<void> load() async {
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      _users = await _repository.getUsers();
    } catch (e) {
      error = e.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  void search(String value) {
    query = value;
    notifyListeners();
  }
}
