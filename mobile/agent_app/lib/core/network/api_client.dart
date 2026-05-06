import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../data/repositories/session_repository.dart';
import 'api_exception.dart';

class ApiClient {
  ApiClient({
    required this.baseUrl,
    required SessionRepository sessionRepository,
  }) : _sessionRepository = sessionRepository;

  final String baseUrl;
  final SessionRepository _sessionRepository;

  Future<T> get<T>(
    String path, {
    required T Function(dynamic json) parser,
    bool authenticated = true,
  }) async {
    final response = await http.get(
      Uri.parse('$baseUrl$path'),
      headers: await _headers(authenticated: authenticated),
    );
    return _parse(response, parser);
  }

  Future<T> post<T>(
    String path, {
    required T Function(dynamic json) parser,
    bool authenticated = false,
    Object? body,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: await _headers(authenticated: authenticated),
      body: body == null ? null : jsonEncode(body),
    );
    return _parse(response, parser);
  }

  Future<Map<String, String>> _headers({required bool authenticated}) async {
    final headers = <String, String>{'Content-Type': 'application/json'};

    if (authenticated) {
      final token = await _sessionRepository.getAccessToken();
      if (token == null || token.isEmpty) {
        throw ApiException(
          message: 'Session agent absente.',
          statusCode: 401,
        );
      }
      headers['Authorization'] = 'Bearer $token';
    }

    return headers;
  }

  T _parse<T>(http.Response response, T Function(dynamic json) parser) {
    final payload = _decode(response);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(
        message: _extractMessage(payload, response.statusCode),
        statusCode: response.statusCode,
        payload: payload,
      );
    }

    return parser(payload);
  }

  dynamic _decode(http.Response response) {
    final rawBody = response.body.trim();
    if (rawBody.isEmpty) {
      return null;
    }

    final contentType = response.headers['content-type'] ?? '';
    if (!contentType.toLowerCase().contains('application/json')) {
      throw ApiException(
        message: 'Réponse non JSON reçue depuis l’API.',
        statusCode: response.statusCode,
        payload: rawBody,
      );
    }

    try {
      return jsonDecode(rawBody);
    } catch (_) {
      throw ApiException(
        message: 'JSON invalide reçu depuis l’API.',
        statusCode: response.statusCode,
        payload: rawBody,
      );
    }
  }

  String _extractMessage(dynamic payload, int statusCode) {
    if (payload is Map<String, dynamic>) {
      final message = payload['message'];
      if (message is String) {
        return message;
      }
      if (message is List && message.isNotEmpty) {
        return message.join(', ');
      }
    }

    return 'La requête a échoué ($statusCode).';
  }
}

