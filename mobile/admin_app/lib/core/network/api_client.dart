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

  Future<T> patch<T>(
    String path, {
    required T Function(dynamic json) parser,
    bool authenticated = true,
    Object? body,
  }) async {
    final response = await http.patch(
      Uri.parse('$baseUrl$path'),
      headers: await _headers(authenticated: authenticated),
      body: body == null ? null : jsonEncode(body),
    );
    return _parse(response, parser);
  }

  Future<T> delete<T>(
    String path, {
    required T Function(dynamic json) parser,
    bool authenticated = true,
  }) async {
    final response = await http.delete(
      Uri.parse('$baseUrl$path'),
      headers: await _headers(authenticated: authenticated),
    );
    return _parse(response, parser);
  }

  Future<Map<String, String>> _headers({required bool authenticated}) async {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (authenticated) {
      final token = await _sessionRepository.getAccessToken();
      if (token == null || token.isEmpty) {
        throw ApiException(message: 'Session admin absente.', statusCode: 401);
      }
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  T _parse<T>(http.Response response, T Function(dynamic json) parser) {
    final payload = _decode(response);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(
        message: _message(payload, response.statusCode),
        statusCode: response.statusCode,
        payload: payload,
      );
    }
    return parser(payload);
  }

  dynamic _decode(http.Response response) {
    final raw = response.body.trim();
    if (raw.isEmpty) {
      return null;
    }

    final contentType = response.headers['content-type'] ?? '';
    if (!contentType.toLowerCase().contains('application/json')) {
      throw ApiException(
        message: 'Réponse non JSON reçue depuis l’API.',
        statusCode: response.statusCode,
        payload: raw,
      );
    }

    try {
      return jsonDecode(raw);
    } catch (_) {
      throw ApiException(
        message: 'JSON invalide reçu depuis l’API.',
        statusCode: response.statusCode,
        payload: raw,
      );
    }
  }

  String _message(dynamic payload, int statusCode) {
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

