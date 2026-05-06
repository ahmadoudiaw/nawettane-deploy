import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import '../../data/models/login_response.dart';
import 'api_exception.dart';

class ApiClient {
  ApiClient({required this.baseUrl});

  final String baseUrl;
  String? _publicToken;

  Future<T> get<T>(
    String path, {
    required T Function(dynamic json) parser,
    bool authenticated = false,
  }) async {
    final headers = await _headers(authenticated: authenticated);
    final response = await http.get(Uri.parse('$baseUrl$path'), headers: headers);
    return _parse(response, parser);
  }

  Future<T> post<T>(
    String path, {
    required T Function(dynamic json) parser,
    Object? body,
    bool authenticated = false,
  }) async {
    final headers = await _headers(authenticated: authenticated);
    final response = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: headers,
      body: body == null ? null : jsonEncode(body),
    );
    return _parse(response, parser);
  }

  Future<Map<String, String>> _headers({required bool authenticated}) async {
    final headers = <String, String>{'Content-Type': 'application/json'};

    if (authenticated) {
      final token = await _ensurePublicToken();
      headers['Authorization'] = 'Bearer $token';
    }

    return headers;
  }

  Future<String> _ensurePublicToken() async {
    if (_publicToken != null) {
      return _publicToken!;
    }

    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'identifier': AppConfig.publicDemoIdentifier,
        'password': AppConfig.publicDemoPassword,
      }),
    );

    final payload = _decodeBody(response);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(
        message: _resolveMessage(payload, response.statusCode),
        statusCode: response.statusCode,
        payload: payload,
      );
    }

    _publicToken = LoginResponse.fromJson(payload).accessToken;
    return _publicToken!;
  }

  T _parse<T>(http.Response response, T Function(dynamic json) parser) {
    final payload = _decodeBody(response);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(
        message: _resolveMessage(payload, response.statusCode),
        statusCode: response.statusCode,
        payload: payload,
      );
    }

    return parser(payload);
  }

  dynamic _decodeBody(http.Response response) {
    final rawBody = response.body.trim();
    if (rawBody.isEmpty) {
      return null;
    }

    final contentType = response.headers['content-type'] ?? '';
    if (!contentType.toLowerCase().contains('application/json')) {
      throw ApiException(
        message: 'Réponse API non JSON reçue.',
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

  String _resolveMessage(dynamic payload, int statusCode) {
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

