import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../models/login_response.dart';
import 'session_repository.dart';

class AuthRepository {
  AuthRepository(this._apiClient, this._sessionRepository);

  final ApiClient _apiClient;
  final SessionRepository _sessionRepository;

  Future<LoginResponse> login({
    required String identifier,
    required String password,
  }) async {
    final response = await _apiClient.post<LoginResponse>(
      '/auth/login',
      authenticated: false,
      body: {
        'identifier': identifier,
        'password': password,
      },
      parser: (json) => LoginResponse.fromJson(json as Map<String, dynamic>),
    );

    if (!response.user.isGuichetAgent) {
      throw ApiException(
        message: 'Ce compte n’est pas autorisé sur l’application guichet.',
        statusCode: 403,
      );
    }

    await _sessionRepository.saveSession(
      accessToken: response.accessToken,
      user: response.user,
    );

    return response;
  }

  Future<LoginResponse?> restoreSession() async {
    final token = await _sessionRepository.getAccessToken();
    final user = await _sessionRepository.getUser();
    if (token == null || user == null || !user.isGuichetAgent) {
      return null;
    }

    return LoginResponse(accessToken: token, user: user);
  }

  Future<void> logout() async {
    await _sessionRepository.clear();
  }
}

