class ApiException implements Exception {
  ApiException({
    required this.message,
    required this.statusCode,
    this.payload,
  });

  final String message;
  final int statusCode;
  final Object? payload;

  @override
  String toString() => 'ApiException($statusCode): $message';
}

