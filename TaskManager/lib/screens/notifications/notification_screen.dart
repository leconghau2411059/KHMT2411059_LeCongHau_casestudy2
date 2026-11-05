import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../models/app_notification.dart';
import '../../services/api_client.dart';
import '../../services/notification_service.dart';
import '../../utils/constants.dart';
import '../../widgets/loading_view.dart';
import '../tasks/task_detail_screen.dart';

/// Màn hình 9: Thông báo (đánh dấu đã đọc, mở công việc liên quan).
class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key});

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  final _service = NotificationService.instance;

  List<AppNotification> _items = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = _items.isEmpty;
      _error = null;
    });
    try {
      final page = await _service.list();
      if (!mounted) return;
      setState(() {
        _items = page.items;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  Future<void> _markAll() async {
    try {
      await _service.markAllRead();
      if (!mounted) return;
      setState(() => _items = _items.map((n) => n.copyWith(isRead: true)).toList());
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  Future<void> _open(AppNotification n) async {
    if (!n.isRead) {
      try {
        await _service.markRead(n.id);
        if (mounted) {
          setState(() => _items = [for (final i in _items) i.id == n.id ? i.copyWith(isRead: true) : i]);
        }
      } on ApiException {
        // Không chặn việc mở công việc nếu đánh dấu đã đọc lỗi.
      }
    }
    if (n.taskId != null && mounted) {
      await Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => TaskDetailScreen(taskId: n.taskId!)),
      );
    }
  }

  IconData _icon(String type) {
    switch (type) {
      case 'task_assigned':
        return Icons.assignment_ind_outlined;
      case 'task_shared':
      case 'share_updated':
        return Icons.share_outlined;
      case 'share_revoked':
      case 'task_unassigned':
        return Icons.block;
      case 'task_completed':
        return Icons.check_circle_outline;
      case 'due_reminder':
      case 'due_date_changed':
        return Icons.alarm;
      default:
        return Icons.notifications_none;
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasUnread = _items.any((n) => !n.isRead);
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Thông báo'),
        actions: [
          if (hasUnread)
            TextButton(onPressed: _markAll, child: const Text('Đọc tất cả')),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) return const LoadingView();
    if (_error != null) return ErrorView(message: _error!, onRetry: _load);
    if (_items.isEmpty) {
      return const EmptyView(icon: Icons.notifications_off_outlined, message: 'Chưa có thông báo nào');
    }
    final fmt = DateFormat('dd/MM/yyyy HH:mm');
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        itemCount: _items.length,
        separatorBuilder: (_, _) => const Divider(height: 1),
        itemBuilder: (context, i) {
          final n = _items[i];
          return Container(
            color: n.isRead ? Colors.transparent : AppColors.primary.withValues(alpha: 0.06),
            child: ListTile(
              leading: Icon(_icon(n.type), color: n.isRead ? AppColors.textGrey : AppColors.primary),
              title: Text(
                n.title,
                style: TextStyle(fontWeight: n.isRead ? FontWeight.normal : FontWeight.bold),
              ),
              subtitle: Text([
                if (n.message.isNotEmpty) n.message,
                if (n.createdAt != null) fmt.format(n.createdAt!),
              ].join('\n')),
              isThreeLine: n.message.isNotEmpty && n.createdAt != null,
              onTap: () => _open(n),
            ),
          );
        },
      ),
    );
  }
}
