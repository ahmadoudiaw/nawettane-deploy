enum ValidationResult {
  valid('VALID'),
  alreadyUsed('ALREADY_USED'),
  invalid('INVALID'),
  outOfScope('OUT_OF_SCOPE');

  const ValidationResult(this.apiValue);

  final String apiValue;

  static ValidationResult fromApi(String value) {
    return ValidationResult.values.firstWhere(
      (item) => item.apiValue == value,
      orElse: () => ValidationResult.invalid,
    );
  }
}

class ScanValidationResponse {
  ScanValidationResponse({
    required this.result,
    this.ticketId,
    this.scanId,
    this.reason,
    this.message,
  });

  final ValidationResult result;
  final String? ticketId;
  final String? scanId;
  final String? reason;
  final String? message;

  factory ScanValidationResponse.fromJson(Map<String, dynamic> json) {
    return ScanValidationResponse(
      result: ValidationResult.fromApi(json['result'] as String? ?? 'INVALID'),
      ticketId: json['ticketId'] as String?,
      scanId: json['scanId'] as String?,
      reason: json['reason'] as String?,
      message: json['message'] as String?,
    );
  }
}

