import 'package:flutter/material.dart';

import '../../models/task.dart';
import '../../models/user.dart';
import '../../services/api_client.dart';
import '../../services/task_service.dart';
import '../../utils/constants.dart';
import '../../utils/date_formatter.dart';
import '../../widgets/loading_view.dart';
import '../../widgets/priority_badge.dart';
import '../../widgets/status_badge.dart';
import '../assignment/assign_task_screen.dart';
import '../sharing/task_sharing_screen.dart';
import 'task_edit_screen.dart';

/// Màn hình 4: Chi tiết công việc.
class TaskDetailScreen extends StatefulWidget {
  final String taskId;

  const TaskDetailScreen({super.key, required this.taskId});

  @override
  State<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends State<TaskDetailScreen> {
  final _service = TaskService.instance;

  Task? _task;
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
      _loading = _task == null;
      _error = null;
    });
    try {
      final task = await _service.get(widget.taskId);
      if (!mounted) return;
      setState(() {
        _task = task;
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

  Future<void> _changeStatus(String status) async {
    final task = _task;
    if (task == null || task.status == status || _busy) return;
    setState(() => _busy = true);
    try {
      final updated = await _service.updateStatus(task.id, status);
      if (!mounted) return;
      setState(() => _task = updated);
      _toast('Đã chuyển sang "${TaskOptions.statusLabel(status)}"');
    } on ApiException catch (e) {
      if (mounted) _toast(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _edit() async {
    final task = _task;
    if (task == null) return;
    final changed = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => TaskEditScreen(task: task)),
    );
    if (changed == true) _load();
  }

  Future<void> _openManage(Widget screen) async {
    await Navigator.push(context, MaterialPageRoute(builder: (_) => screen));
    if (mounted) _load();
  }

  Future<void> _delete() async {
    final task = _task;
    if (task == null) return;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Xóa công việc'),
        content: Text('Bạn có chắc muốn xóa "${task.title}" không? Thao tác này không thể hoàn tác.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Hủy')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Xóa', style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await _service.delete(task.id);
      if (!mounted) return;
      Navigator.pop(context, true);
    } on ApiException catch (e) {
      if (mounted) _toast(e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final task = _task;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Chi tiết công việc'),
        actions: [
          if (task != null && task.canEdit)
            IconButton(icon: const Icon(Icons.edit_outlined), tooltip: 'Chỉnh sửa', onPressed: _edit),
          if (task != null && task.canDelete)
            IconButton(
              icon: const Icon(Icons.delete_outline, color: AppColors.danger),
              tooltip: 'Xóa',
              onPressed: _delete,
            ),
        ],
      ),
      body: _buildBody(task),
    );
  }

  Widget _buildBody(Task? task) {
    if (_loading) return const LoadingView();
    if (task == null) return ErrorView(message: _error ?? 'Không tải được công việc', onRetry: _load);

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildHeader(task),
          const SizedBox(height: 12),
          _buildInfoCard(task),
          const SizedBox(height: 12),
          _buildPeopleCard(task),
          const SizedBox(height: 12),
          _buildStatusCard(task),
          if (task.canManage) ...[
            const SizedBox(height: 12),
            _buildManageCard(task),
          ],
        ],
      ),
    );
  }

  Widget _card(Widget child) {
    return Card(
      margin: EdgeInsets.zero,
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: Padding(padding: const EdgeInsets.all(16), child: child),
    );
  }

  Widget _buildHeader(Task task) {
    return _card(
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(task.title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: [
              StatusBadge(status: task.status),
              PriorityBadge(priority: task.priority),
              if (task.isOverdue)
                const Text('Quá hạn', style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.w600)),
            ],
          ),
          if (task.description.isNotEmpty) ...[
            const SizedBox(height: 14),
            Text(task.description),
          ],
        ],
      ),
    );
  }

  Widget _buildInfoCard(Task task) {
    return _card(
      Column(
        children: [
          _infoRow(Icons.person_outline, 'Người tạo', task.createdBy?.fullName ?? '—'),
          _infoRow(Icons.play_circle_outline, 'Ngày bắt đầu', DateFormatter.date(task.startDate)),
          _infoRow(
            Icons.event,
            'Hạn hoàn thành',
            task.dueDate == null
                ? 'Chưa đặt'
                : '${DateFormatter.date(task.dueDate)} (${DateFormatter.dueHint(task.dueDate)})',
          ),
          _infoRow(Icons.badge_outlined, 'Vai trò của bạn', TaskOptions.roleLabel(task.myRole)),
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: AppColors.textGrey),
          const SizedBox(width: 10),
          SizedBox(width: 120, child: Text(label, style: const TextStyle(color: AppColors.textGrey))),
          Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500))),
        ],
      ),
    );
  }

  Widget _buildPeopleCard(Task task) {
    return _card(
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Người phụ trách', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          if (task.assignees.isEmpty)
            const Text('Chưa giao cho ai', style: TextStyle(color: AppColors.textGrey))
          else
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: [for (final u in task.assignees) _personChip(u, task.primaryAssignee)],
            ),
        ],
      ),
    );
  }

  Widget _personChip(User user, User? primary) {
    final isPrimary = primary != null && primary.id == user.id;
    return Chip(
      avatar: isPrimary ? const Icon(Icons.star, size: 16, color: AppColors.warning) : null,
      label: Text(user.fullName),
    );
  }

  Widget _buildManageCard(Task task) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => _openManage(AssignTaskScreen(task: task)),
            icon: const Icon(Icons.group_add_outlined),
            label: const Text('Giao việc'),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => _openManage(TaskSharingScreen(task: task)),
            icon: const Icon(Icons.share_outlined),
            label: const Text('Chia sẻ'),
          ),
        ),
      ],
    );
  }

  Widget _buildStatusCard(Task task) {
    if (!task.canEdit) {
      return _card(
        const Row(
          children: [
            Icon(Icons.visibility_outlined, color: AppColors.textGrey),
            SizedBox(width: 10),
            Expanded(
              child: Text(
                'Bạn chỉ có quyền xem công việc này.',
                style: TextStyle(color: AppColors.textGrey),
              ),
            ),
          ],
        ),
      );
    }
    return _card(
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Cập nhật trạng thái', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              for (final s in TaskOptions.statuses)
                ChoiceChip(
                  label: Text(TaskOptions.statusLabel(s)),
                  selected: task.status == s,
                  onSelected: _busy ? null : (_) => _changeStatus(s),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
