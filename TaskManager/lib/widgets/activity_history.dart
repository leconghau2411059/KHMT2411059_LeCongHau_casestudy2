import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/task_activity.dart';
import '../services/api_client.dart';
import '../services/statistics_service.dart';
import '../utils/constants.dart';

/// Lịch sử hoạt động của một công việc (tải khi hiển thị; [reloadKey] đổi để tải lại).
class ActivityHistory extends StatefulWidget {
  final String taskId;
  final Object? reloadKey;

  const ActivityHistory({super.key, required this.taskId, this.reloadKey});

  @override
  State<ActivityHistory> createState() => _ActivityHistoryState();
}

class _ActivityHistoryState extends State<ActivityHistory> {
  List<TaskActivity>? _items;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant ActivityHistory old) {
    super.didUpdateWidget(old);
    if (old.reloadKey != widget.reloadKey) _load();
  }

  Future<void> _load() async {
    try {
      final items = await StatisticsService.instance.activities(widget.taskId);
      if (!mounted) return;
      setState(() {
        _items = items;
        _error = null;
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('dd/MM/yyyy HH:mm');
    final items = _items;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Lịch sử hoạt động', style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        if (_error != null)
          Text(_error!, style: const TextStyle(color: AppColors.danger))
        else if (items == null)
          const Center(child: Padding(padding: EdgeInsets.all(8), child: CircularProgressIndicator()))
        else if (items.isEmpty)
          const Text('Chưa có hoạt động nào', style: TextStyle(color: AppColors.textGrey))
        else
          for (final a in items)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.history, size: 16, color: AppColors.textGrey),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text.rich(
                      TextSpan(children: [
                        TextSpan(
                          text: a.user?.fullName ?? 'Ai đó',
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        TextSpan(text: ' ${a.description}'),
                        if (a.createdAt != null)
                          TextSpan(
                            text: '  ${fmt.format(a.createdAt!)}',
                            style: const TextStyle(color: AppColors.textGrey, fontSize: 12),
                          ),
                      ]),
                    ),
                  ),
                ],
              ),
            ),
      ],
    );
  }
}
