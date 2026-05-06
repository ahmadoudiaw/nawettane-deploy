import 'package:flutter/material.dart';

import '../../../app.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/admin_user.dart';
import '../../controllers/users_controller.dart';

class UsersScreen extends StatefulWidget {
  const UsersScreen({super.key});

  @override
  State<UsersScreen> createState() => _UsersScreenState();
}

class _UsersScreenState extends State<UsersScreen> {
  UsersController? _controller;
  final _searchController = TextEditingController();

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _controller ??= UsersController(AdminAppScope.of(context).usersRepository)..load();
  }

  @override
  void dispose() {
    _controller?.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    if (controller == null) return const SizedBox.shrink();

    return RefreshIndicator(
      onRefresh: controller.load,
      child: AnimatedBuilder(
        animation: controller,
        builder: (context, _) {
          final users = controller.filtered;

          return CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
                  child: TextField(
                    controller: _searchController,
                    decoration: const InputDecoration(
                      hintText: 'Rechercher un utilisateur...',
                      prefixIcon: Icon(Icons.search),
                    ),
                    onChanged: controller.search,
                  ),
                ),
              ),
              if (controller.isLoading && controller.total == 0)
                const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (controller.error != null)
                SliverFillRemaining(
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(
                        controller.error!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.red),
                      ),
                    ),
                  ),
                )
              else if (users.isEmpty)
                const SliverFillRemaining(
                  child: Center(
                    child: Text('Aucun utilisateur trouvé.'),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 110),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _UserCard(user: users[index]),
                      ),
                      childCount: users.length,
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _UserCard extends StatelessWidget {
  const _UserCard({required this.user});

  final AdminUser user;

  @override
  Widget build(BuildContext context) {
    final isActive = user.status == 'ACTIVE';
    final statusColor = isActive ? const Color(0xFF17884C) : const Color(0xFF9E9E9E);
    final statusBg = isActive ? const Color(0xFFE8F5EE) : const Color(0xFFF0F0F0);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    user.fullName,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                const SizedBox(width: 8),
                _Badge(
                  label: formatUserStatus(user.status),
                  color: statusColor,
                  background: statusBg,
                ),
              ],
            ),
            const SizedBox(height: 6),
            _Badge(
              label: formatRole(user.role),
              color: const Color(0xFF0D5C8B),
              background: const Color(0xFFE3EEF6),
            ),
            const SizedBox(height: 10),
            _ContactLine(icon: Icons.phone_outlined, text: user.phone),
            if (user.email != null && user.email!.isNotEmpty)
              _ContactLine(icon: Icons.email_outlined, text: user.email!),
            if (user.organizationNames.isNotEmpty)
              _ContactLine(
                icon: Icons.location_city_outlined,
                text: user.organizationNames.join(', '),
              ),
          ],
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({
    required this.label,
    required this.color,
    required this.background,
  });

  final String label;
  final Color color;
  final Color background;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    );
  }
}

class _ContactLine extends StatelessWidget {
  const _ContactLine({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        children: [
          Icon(icon, size: 15, color: const Color(0xFF59636A)),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 13, color: Color(0xFF59636A)),
            ),
          ),
        ],
      ),
    );
  }
}
