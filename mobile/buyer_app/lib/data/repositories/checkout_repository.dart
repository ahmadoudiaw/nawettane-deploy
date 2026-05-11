import '../../core/network/api_client.dart';
import '../models/order.dart';
import '../models/ticket.dart';

class CheckoutRepository {
  CheckoutRepository(this._apiClient);

  final ApiClient _apiClient;

  // ─── Création de commande ────────────────────────────────────────────────

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

  // ─── Initiation Wave réel ────────────────────────────────────────────────

  /// Crée une session Wave Checkout et retourne l'URL de paiement.
  /// Appelle POST /payments/:orderId/wave/initiate
  Future<WaveInitiateResult> waveInitiate(String orderId) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '/payments/$orderId/wave/initiate',
      parser: (json) => json as Map<String, dynamic>,
    );
    return WaveInitiateResult(
      waveLaunchUrl: response['wave_launch_url'] as String,
      sessionId: response['session_id'] as String,
    );
  }

  // ─── Statut commande (polling post-paiement) ─────────────────────────────

  /// Interroge le statut d'une commande.
  /// Appelle GET /payments/:orderId/status
  Future<OrderStatusResult> getOrderStatus(String orderId) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/payments/$orderId/status',
      parser: (json) => json as Map<String, dynamic>,
    );
    final ticketsJson = response['tickets'] as List<dynamic>? ?? [];
    return OrderStatusResult(
      status: response['status'] as String,
      tickets: ticketsJson
          .whereType<Map<String, dynamic>>()
          .map(TicketModel.fromJson)
          .toList(),
    );
  }

  // ─── Mock (dev uniquement, bloqué en production) ─────────────────────────

  /// Confirmation instantanée sans paiement réel.
  /// Nécessite ALLOW_MOCK_PAYMENTS=true côté backend.
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

// ─── Résultats typés ────────────────────────────────────────────────────────

class WaveInitiateResult {
  const WaveInitiateResult({
    required this.waveLaunchUrl,
    required this.sessionId,
  });
  final String waveLaunchUrl;
  final String sessionId;
}

class OrderStatusResult {
  const OrderStatusResult({
    required this.status,
    required this.tickets,
  });
  final String status;
  final List<TicketModel> tickets;

  bool get isPaid => status == 'PAID';
}
