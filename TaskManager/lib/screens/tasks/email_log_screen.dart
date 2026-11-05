import 'package:flutter/material.dart';

import '../../models/app_notification.dart';
import '../../services/api_client.dart';
import '../../services/notification_service.dart';
import '../../utils/constants.dart';
import '../../widgets/loading_view.dart';

/// Nhật ký email của một công việc (chỉ người tạo xem được); gửi lại email lỗi.
class EmailLogScreen extends StatefulWidget {
  final String taskId;

  const EmailLogScreen({super.key, required this.taskId});

  @override
  State<EmailLogScreen> createState() => _EmailLogScreenState();
}

class _EmailLogScreenState extends State<EmailLogScreen> {
  final _service = NotificationService.instance;

  List<EmailLogItem> _logs = [];
  bool _loading = true;
  String? _error;
  String? _retrying;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = _logs.isEmpty;
      _error = null;
    });
    try {
      final logs = await _service.emailLogs(widget.taskId);
      if (!mounted) return;
      setState(() {
        _logs = logs;
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

  Future<void> _retry(EmailLogItem log) async {
    setState(() => _retrying = log.id);
    try {
      final result = await _service.retryEmail(log.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result.status == 'sent' ? 'Đã gửi lại email' : 'Gửi lại thất bại')),
      );
      await _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _retrying = null);
    }
  }

  Color _color(String status) {
    switch (status) {
      case 'sent':
        return AppColors.success;
      case 'failed':
        return AppColors.danger;
      default:
        return AppColors.warning;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Nhật ký email')),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) return const LoadingView();
    if (_error != null) return ErrorView(message: _error!, onRetry: _load);
    if (_logs.isEmpty) {
      return const EmptyView(icon: Icons.mail_outline, message: 'Chưa có email nào được gửi cho công việc này');
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        itemCount: _logs.length,
        separatorBuilder: (_, _) => const Divider(height: 1),
        itemBuilder: (context, i) {
          final log = _logs[i];
          return ListTile(
            title: Text(log.to),
            subtitle: Text(
              '${log.subject}\n${log.statusLabel} · ${log.attempts} lần gửi'
              '${log.lastError.isNotEmpty ? '\nLỗi: ${log.lastError}' : ''}',
            ),
            isThreeLine: true,
            leading: Icon(Icons.mail_outline, color: _color(log.status)),
            trailing: log.canRetry
                ? (_retrying == log.id
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : TextButton(onPressed: () => _retry(log), child: const Text('Gửi lại')))
                : null,
          );
        },
      ),
    );
  }
}
