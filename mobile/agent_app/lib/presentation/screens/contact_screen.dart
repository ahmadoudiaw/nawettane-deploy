import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show Clipboard, ClipboardData;
import 'package:url_launcher/url_launcher.dart';

import '../../data/models/app_settings.dart';
import '../../data/repositories/app_settings_repository.dart';

class ContactScreen extends StatefulWidget {
  const ContactScreen({super.key});

  @override
  State<ContactScreen> createState() => _ContactScreenState();
}

class _ContactScreenState extends State<ContactScreen> {
  AppSettingsModel _settings = AppSettingsModel.defaults;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    AppSettingsRepository().getSettings().then((s) {
      if (mounted) setState(() { _settings = s; _loading = false; });
    });
  }

  void _copyPhone(String phone) {
    final cleaned = phone.trim();
    if (cleaned.isEmpty) return;
    Clipboard.setData(ClipboardData(text: cleaned));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Numéro copié.')),
    );
  }

  Future<void> _launchPhone(String phone) async {
    final cleaned = phone.trim();
    if (cleaned.isEmpty) return;

    final uri = Uri(scheme: 'tel', path: cleaned);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Impossible d'ouvrir le dialer.")),
        );
      }
    }
  }

  String _normalizeWhatsAppPhone(String phone) {
    String digits = phone.replaceAll(RegExp(r'[^\d]'), '');

    if (digits.length == 9 && digits.startsWith('7')) {
      return '221$digits';
    }
    if (digits.startsWith('0')) {
      digits = digits.substring(1);
      if (digits.startsWith('7') && digits.length == 9) {
        return '221$digits';
      }
    }
    return digits;
  }

  Future<void> _openWhatsApp(String phone) async {
    final normalized = _normalizeWhatsAppPhone(phone);
    if (normalized.isEmpty) return;

    final message = Uri.encodeComponent(
      'Bonjour, je vous contacte depuis l\'application Nawettane.',
    );
    final uri = Uri.parse('https://wa.me/$normalized?text=$message');

    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Impossible d'ouvrir WhatsApp.")),
        );
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Impossible d'ouvrir WhatsApp.")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasPhone = _settings.contactPhone.trim().isNotEmpty;

    return Scaffold(
      appBar: AppBar(title: const Text('Contact')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
                      children: [
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _settings.applicationTitle,
                                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                        fontWeight: FontWeight.w800,
                                      ),
                                ),
                                const Divider(height: 32),
                                _ContactRow(
                                  icon: Icons.person_outline,
                                  label: 'Contact',
                                  value: _settings.contactLabel,
                                ),
                                const SizedBox(height: 16),
                                _ContactRow(
                                  icon: Icons.phone_outlined,
                                  label: 'Téléphone',
                                  value: _settings.contactPhone,
                                  onTap: hasPhone
                                      ? () => _launchPhone(_settings.contactPhone)
                                      : null,
                                  onLongPress: hasPhone
                                      ? () => _copyPhone(_settings.contactPhone)
                                      : null,
                                ),
                                if (hasPhone) ...[
                                  const SizedBox(height: 20),
                                  SizedBox(
                                    width: double.infinity,
                                    child: ElevatedButton.icon(
                                      onPressed: () => _openWhatsApp(_settings.contactPhone),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF25D366),
                                        foregroundColor: Colors.white,
                                        padding: const EdgeInsets.symmetric(vertical: 14),
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                      ),
                                      icon: const Icon(Icons.chat, size: 20),
                                      label: const Text(
                                        'Contacter via WhatsApp',
                                        style: TextStyle(fontWeight: FontWeight.w600),
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                    child: Column(
                      children: [
                        const Divider(),
                        const SizedBox(height: 12),
                        Text(
                          'Application conçue et développée par : ${_settings.developerName}',
                          style: Theme.of(context).textTheme.bodySmall,
                          textAlign: TextAlign.center,
                        ),
                        if (_settings.developerWebsite.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            _settings.developerWebsite,
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}

class _ContactRow extends StatelessWidget {
  const _ContactRow({
    required this.icon,
    required this.label,
    required this.value,
    this.onTap,
    this.onLongPress,
  });

  final IconData icon;
  final String label;
  final String value;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;

  @override
  Widget build(BuildContext context) {
    final content = Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: Theme.of(context).colorScheme.primary),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: onTap != null
                          ? Theme.of(context).colorScheme.primary
                          : null,
                      decoration: onTap != null
                          ? TextDecoration.underline
                          : null,
                    ),
              ),
            ],
          ),
        ),
        if (onTap != null)
          Icon(Icons.call, size: 18, color: Theme.of(context).colorScheme.primary),
      ],
    );

    if (onTap == null && onLongPress == null) return content;

    return InkWell(
      onTap: onTap,
      onLongPress: onLongPress,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: content,
      ),
    );
  }
}
