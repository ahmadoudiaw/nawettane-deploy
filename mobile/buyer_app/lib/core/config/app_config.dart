class AppConfig {
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000/api',
  );

  static const publicDemoIdentifier = String.fromEnvironment(
    'PUBLIC_DEMO_IDENTIFIER',
    defaultValue: 'oncav.admin@nawettane.sn',
  );

  static const publicDemoPassword = String.fromEnvironment(
    'PUBLIC_DEMO_PASSWORD',
    defaultValue: 'Nawettane2026!',
  );
}

