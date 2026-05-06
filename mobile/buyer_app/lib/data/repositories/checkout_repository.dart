import '../../core/network/api_client.dart';
import '../models/order.dart';
import '../models/ticket.dart';

class CheckoutRepository {
  CheckoutRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<OrderModel> createOrder({
    required String matchId,
    required String ticketCategoryId,
    required String buyerName,
    required String buyerPhone,
    required String buyerEmail,
    required int quantity,
  }) {
    return _apiClient.post<OrderModel>(
      '/orders',
      parser: (json) => OrderModel.fromJson(json as Map<String, dynamic>),
      body: {
        'matchId': matchId,
        'ticketCategoryId': ticketCategoryId,
        'buyerName': buyerName,
        'buyerPhone': buyerPhone,
        if (buyerEmail.trim().isNotEmpty) 'buyerEmail': buyerEmail.trim(),
        'quantity': quantity,
      },
    );
  }

  Future<List<TicketModel>> confirmMockPayment({
    required String orderId,
    required String provider,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '/payments/$orderId/mock-confirm',
      parser: (json) => json as Map<String, dynamic>,
      body: {
        'provider': provider,
        'providerReference': '$provider-FLUTTER-${DateTime.now().millisecondsSinceEpoch}',
      },
    );

    final orderJson = response['order'] as Map<String, dynamic>? ?? {};
    final tickets = (orderJson['tickets'] as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(TicketModel.fromJson)
        .toList();

    return tickets;
  }
}

