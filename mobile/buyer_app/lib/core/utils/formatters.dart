import 'package:intl/intl.dart';

final _currencyFormat = NumberFormat.currency(
  locale: 'fr_SN',
  symbol: 'FCFA',
  decimalDigits: 0,
);

final _dateFormat = DateFormat('EEE d MMM · HH:mm', 'fr_FR');

String formatCurrency(num value) => _currencyFormat.format(value);

String formatDate(DateTime date) => _dateFormat.format(date);

String formatShortDate(DateTime date) => DateFormat('dd/MM/yyyy', 'fr_FR').format(date);

String formatTicketStatus(String status) {
  switch (status) {
    case 'GENERATED': return 'Non utilisé';
    case 'USED': return 'Déjà utilisé';
    case 'CANCELLED': return 'Annulé';
    default: return status;
  }
}

