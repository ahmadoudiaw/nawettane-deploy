import 'package:flutter_test/flutter_test.dart';
import 'package:nawettane_agent/app.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const NawettaneAgentApp());
  });
}
