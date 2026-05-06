import 'package:intl/intl.dart';

final _currency = NumberFormat.currency(
  locale: 'fr_SN',
  symbol: 'FCFA',
  decimalDigits: 0,
);
final _date = DateFormat('EEE d MMM · HH:mm', 'fr_FR');

String formatCurrency(num value) => _currency.format(value);

String formatDateTime(DateTime value) => _date.format(value);

const _matchStatusLabels = {
  'DRAFT': 'Brouillon',
  'PUBLISHED': 'Publié',
  'CLOSED': 'Clôturé',
  'CANCELLED': 'Annulé',
};

String formatMatchStatus(String status) => _matchStatusLabels[status] ?? status;

const _roleLabels = {
  'SUPER_ADMIN': 'Super Admin',
  'ONCAV_ADMIN': 'Admin ONCAV',
  'ORCAV_ADMIN': 'Admin ORCAV',
  'ODCAV_ADMIN': 'Admin ODCAV',
  'ZONE_ADMIN': 'Admin de zone',
  'GUICHET_AGENT': 'Agent de guichet',
  'AGENT_MAIRIE': 'Agent mairie',
  'SUPPORTER': 'Supporter',
};

const _userStatusLabels = {
  'ACTIVE': 'Actif',
  'INACTIVE': 'Inactif',
  'SUSPENDED': 'Suspendu',
};

String formatRole(String role) => _roleLabels[role] ?? role;

String formatUserStatus(String status) => _userStatusLabels[status] ?? status;

