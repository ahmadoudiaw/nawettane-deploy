import '../../core/network/api_client.dart';
import '../models/admin_user.dart';

class UsersRepository {
  UsersRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<List<AdminUser>> getUsers() {
    return _apiClient.get<List<AdminUser>>(
      '/users',
      authenticated: true,
      parser: (json) {
        final items = (json as List<dynamic>? ?? []).whereType<Map<String, dynamic>>();
        return items.map(AdminUser.fromJson).toList();
      },
    );
  }
}
