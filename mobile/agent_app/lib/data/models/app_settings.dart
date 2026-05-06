class AppSettingsModel {
  const AppSettingsModel({
    required this.applicationTitle,
    required this.contactLabel,
    required this.contactPhone,
    required this.developerName,
    required this.developerWebsite,
  });

  final String applicationTitle;
  final String contactLabel;
  final String contactPhone;
  final String developerName;
  final String developerWebsite;

  static const defaults = AppSettingsModel(
    applicationTitle: 'Nawettane : Système de Billetterie digitale',
    contactLabel: 'Contact :',
    contactPhone: 'Téléphone :',
    developerName: 'DICOTECH',
    developerWebsite: 'Site web :',
  );

  factory AppSettingsModel.fromJson(Map<String, dynamic> json) {
    return AppSettingsModel(
      applicationTitle: json['applicationTitle'] as String? ?? defaults.applicationTitle,
      contactLabel: json['contactLabel'] as String? ?? defaults.contactLabel,
      contactPhone: json['contactPhone'] as String? ?? defaults.contactPhone,
      developerName: json['developerName'] as String? ?? defaults.developerName,
      developerWebsite: json['developerWebsite'] as String? ?? defaults.developerWebsite,
    );
  }
}
