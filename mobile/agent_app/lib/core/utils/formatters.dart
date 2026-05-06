import 'package:intl/intl.dart';

final _dateTime = DateFormat('EEE d MMM · HH:mm', 'fr_FR');

String formatMatchDate(DateTime date) => _dateTime.format(date);

