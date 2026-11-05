import 'package:flutter/material.dart';

import '../../models/task.dart';
import '../../models/task_share.dart';
import '../../services/api_client.dart';
import '../../services/assignment_service.dart';
import '../../utils/constants.dart';
import '../../widgets/loading_view.dart';
import '../../widgets/user_selector.dart';
import '../profile/profile_screen.dart' show UserAvatar;

/// Màn hình 7: Giao công việc (một hoặc nhiều người, có người phụ trách chính).
class AssignTaskScreen extends StatefulWidget {
  final Task task;

  const AssignTaskScreen({super.key, required this.task});

  @override
  State<AssignTaskScreen> createState() => _AssignTaskScreenState();
}

class _AssignTaskScreenState extends State<AssignTaskScreen> {
  final _service = AssignmentService.instance;

  List<Assignee> _assignees = [];
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
      _loading = _assignees.isEmpty;
      _error = null;
    });
    try {
      final list = await _service.list(widget.task.id);
      if (!mounted) return;
      setState(() {
        _assignees = list;
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
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  /// Chạy một thao tác gọi API, hiển thị lỗi nếu có.
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

  Future<void> _add() async {
    final picked = await showUserSelector(
      context,
      title: 'Chọn người được giao',
      excludeIds: _assignees.map((a) => a.user.id).toSet(),
    );
    if (picked == null || picked.isEmpty) return;
    await _run(() async {
      final result = await _service.assign(widget.task.id, picked);
      if (!mounted) return;
      setState(() => _assignees = result.assignees);
      _toast('Đã giao việc cho ${result.addedCount} người');
    });
  }

  Future<void> _makePrimary(Assignee a) => _run(() async {
        final list = await _service.setPrimary(widget.task.id, a.user.id);
        if (!mounted) return;
        setState(() => _assignees = list);
        _toast('${a.user.fullName} là người phụ trách chính');
      });

  Future<void> _remove(Assignee a) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Gỡ người phụ trách'),
        content: Text('Gỡ ${a.user.fullName} khỏi công việc này?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Hủy')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Gỡ', style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await _run(() async {
      await _service.remove(widget.task.id, a.user.id);
      await _load();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Giao công việc')),
      floatingActionButton: widget.task.canManage
          ? FloatingActionButton.extended(
              onPressed: _busy ? null : _add,
              icon: const Icon(Icons.person_add_alt_1),
              label: const Text('Thêm người'),
            )
          : null,
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) return const LoadingView();
    if (_error != null) return ErrorView(message: _error!, onRetry: _load);
    if (_assignees.isEmpty) {
      return const EmptyView(
        icon: Icons.group_add_outlined,
        message: 'Công việc chưa được giao cho ai.\nNhấn "Thêm người" để giao việc.',
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
        children: [
          Text(
            widget.task.title,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          const Text(
            'Người phụ trách chính chịu trách nhiệm chính; những người còn lại phối hợp.',
            style: TextStyle(color: AppColors.textGrey),
          ),
          const SizedBox(height: 12),
          for (final a in _assignees)
            Card(
              elevation: 0,
              color: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(color: Colors.grey.shade200),
              ),
              child: ListTile(
                leading: UserAvatar(user: a.user),
                title: Text(a.user.fullName),
                subtitle: Text(a.isPrimary ? '${a.user.email}\nNgười phụ trách chính' : a.user.email),
                isThreeLine: a.isPrimary,
                trailing: widget.task.canManage
                    ? PopupMenuButton<String>(
                        onSelected: (v) => v == 'primary' ? _makePrimary(a) : _remove(a),
                        itemBuilder: (_) => [
                          if (!a.isPrimary)
                            const PopupMenuItem(value: 'primary', child: Text('Đặt làm người chính')),
                          const PopupMenuItem(value: 'remove', child: Text('Gỡ khỏi công việc')),
                        ],
                      )
                    : (a.isPrimary ? const Icon(Icons.star, color: AppColors.warning) : null),
              ),
            ),
        ],
      ),
    );
  }
}
