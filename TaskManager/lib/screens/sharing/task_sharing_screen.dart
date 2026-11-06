import 'package:flutter/material.dart';

import '../../models/task.dart';
import '../../models/task_share.dart';
import '../../services/api_client.dart';
import '../../services/task_share_service.dart';
import '../../utils/constants.dart';
import '../../widgets/loading_view.dart';
import '../../widgets/user_selector.dart';
import '../profile/profile_screen.dart' show UserAvatar;

/// Màn hình 8: Chia sẻ công việc và phân quyền (viewer / editor).
class TaskSharingScreen extends StatefulWidget {
  final Task task;

  const TaskSharingScreen({super.key, required this.task});

  @override
  State<TaskSharingScreen> createState() => _TaskSharingScreenState();
}

class _TaskSharingScreenState extends State<TaskSharingScreen> {
  final _service = TaskShareService.instance;

  List<TaskShare> _shares = [];
  bool _loading = true;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = _shares.isEmpty;
      _error = null;
    });
    try {
      final list = await _service.list(widget.task.id);
      if (!mounted) return;
      setState(() {
        _shares = list;
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

  void _toast(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await action();
    } on ApiException catch (e) {
      if (mounted) _toast(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// Hộp thoại chọn quyền cho người được chia sẻ.
  Future<String?> _pickPermission(String? current) {
    return showDialog<String>(
      context: context,
      builder: (ctx) => SimpleDialog(
        title: const Text('Chọn quyền truy cập'),
        children: [
          for (final p in const ['viewer', 'editor'])
            ListTile(
              leading: Icon(
                p == current ? Icons.radio_button_checked : Icons.radio_button_off,
                color: AppColors.primary,
              ),
              title: Text(p == 'viewer' ? 'Chỉ xem' : 'Được phép sửa'),
              subtitle: Text(p == 'viewer'
                  ? 'Xem thông tin công việc, không chỉnh sửa'
                  : 'Xem và chỉnh sửa, không xóa hay quản lý chia sẻ'),
              onTap: () => Navigator.pop(ctx, p),
            ),
        ],
      ),
    );
  }

  Future<void> _add() async {
    final picked = await showUserSelector(
      context,
      title: 'Chia sẻ cho',
      multiple: false,
      excludeIds: _shares.map((s) => s.user.id).toSet(),
    );
    if (picked == null || picked.isEmpty || !mounted) return;
    final permission = await _pickPermission('viewer');
    if (permission == null) return;
    await _run(() async {
      await _service.share(widget.task.id, picked.first.id, permission);
      _toast('Đã chia sẻ cho ${picked.first.fullName}');
      await _load();
    });
  }

  Future<void> _changePermission(TaskShare share) async {
    final permission = await _pickPermission(share.permission);
    if (permission == null || permission == share.permission) return;
    await _run(() async {
      await _service.updatePermission(widget.task.id, share.id, permission);
      _toast('Đã đổi quyền của ${share.user.fullName}');
      await _load();
    });
  }

  Future<void> _revoke(TaskShare share) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Thu hồi quyền truy cập'),
        content: Text('${share.user.fullName} sẽ không còn truy cập được công việc này.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Hủy')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Thu hồi', style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await _run(() async {
      await _service.revoke(widget.task.id, share.id);
      _toast('Đã thu hồi quyền truy cập');
      await _load();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Chia sẻ công việc')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _busy ? null : _add,
        icon: const Icon(Icons.share_outlined),
        label: const Text('Chia sẻ'),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) return const LoadingView();
    if (_error != null) return ErrorView(message: _error!, onRetry: _load);
    if (_shares.isEmpty) {
      return const EmptyView(
        icon: Icons.share_outlined,
        message: 'Công việc chưa được chia sẻ cho ai.\nNhấn "Chia sẻ" để thêm người xem hoặc người sửa.',
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
        itemCount: _shares.length,
        itemBuilder: (context, i) {
          final share = _shares[i];
          return Card(
            elevation: 0,
            color: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: Colors.grey.shade200),
            ),
            child: ListTile(
              leading: UserAvatar(user: share.user),
              title: Text(share.user.fullName),
              subtitle: Text('${share.user.email}\n${TaskOptions.roleLabel(share.permission)}'),
              isThreeLine: true,
              trailing: PopupMenuButton<String>(
                onSelected: (v) => v == 'change' ? _changePermission(share) : _revoke(share),
                itemBuilder: (_) => const [
                  PopupMenuItem(value: 'change', child: Text('Đổi quyền')),
                  PopupMenuItem(value: 'revoke', child: Text('Thu hồi')),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
