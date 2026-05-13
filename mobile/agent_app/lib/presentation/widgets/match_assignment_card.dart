import 'package:flutter/material.dart';

class MatchAssignmentCard extends StatelessWidget {
  const MatchAssignmentCard({
    super.key,
    required this.title,
    required this.subtitle,
    required this.venue,
    required this.onTap,
    this.isPast = false,
  });

  final String title;
  final String subtitle;
  final String venue;
  final VoidCallback onTap;
  final bool isPast;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(title, style: Theme.of(context).textTheme.titleMedium),
                  ),
                  if (isPast)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0E6E6),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text(
                        'Terminé',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFFB4312B),
                        ),
                      ),
                    )
                  else
                    const Icon(Icons.chevron_right),
                ],
              ),
              const SizedBox(height: 8),
              Text(subtitle),
              const SizedBox(height: 8),
              Text(
                'Stade: $venue',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

