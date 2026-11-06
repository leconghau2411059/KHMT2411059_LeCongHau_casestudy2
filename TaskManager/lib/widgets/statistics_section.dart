import 'package:flutter/material.dart';

import '../models/statistics.dart';
import '../models/task.dart';
import '../screens/tasks/task_detail_screen.dart';
import '../services/api_client.dart';
import '../services/statistics_service.dart';
import '../utils/constants.dart';
import '../utils/date_formatter.dart';
import 'loading_view.dart';

/// Thống kê công việc: theo trạng thái, giao việc, việc quá hạn và sắp đến hạn.
class StatisticsSection extends StatefulWidget {
  const StatisticsSection({super.key});

  @override
  State<StatisticsSection> createState() => _StatisticsSectionState();
}

class _StatisticsSectionState extends State<StatisticsSection> {
  final _service = StatisticsService.instance;

  TaskStats? _tasks;
  AssignmentStats? _assignments;
  DeadlineStats? _deadlines;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _service.tasks(),
        _service.assignments(),
        _service.deadlines(),
      ]);
      if (!mounted) return;
      setState(() {
        _tasks = results[0] as TaskStats;
        _assignments = results[1] as AssignmentStats;
        _deadlines = results[2] as DeadlineStats;
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

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: LoadingView());
    }
    if (_error != null) {
      return Card(child: SizedBox(height: 180, child: ErrorView(message: _error!, onRetry: _load)));
    }
    final tasks = _tasks!;
    final assign = _assignments!;
    final deadlines = _deadlines!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Thống kê', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Row(
          children: [
            for (final s in TaskOptions.statuses) ...[
              Expanded(
                child: _StatTile(
                  label: TaskOptions.statusLabel(s),
                  value: tasks.byStatus[s] ?? 0,
                  color: TaskOptions.statusColor(s),
                ),
              ),
              if (s != TaskOptions.statuses.last) const SizedBox(width: 8),
            ],
          ],
        ),
        const SizedBox(height: 8),
        Card(
          margin: EdgeInsets.zero,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Tổng ${tasks.total} công việc · hoàn thành ${tasks.completionRate}%'),
                const SizedBox(height: 8),
                LinearProgressIndicator(
                  value: tasks.completionRate / 100,
                  minHeight: 8,
                  borderRadius: BorderRadius.circular(4),
                ),
                const Divider(height: 24),
                _line('Tôi tạo', assign.created),
                _line('Được giao cho tôi', assign.assigned),
                _line('Tôi là người phụ trách chính', assign.primaryResponsible),
                _line('Được chia sẻ với tôi', assign.sharedWithMe),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        _deadlineBlock(
          'Quá hạn (${deadlines.overdueCount})',
          deadlines.overdue,
          AppColors.danger,
          'Không có công việc quá hạn',
        ),
        const SizedBox(height: 12),
        _deadlineBlock(
          'Sắp đến hạn trong ${deadlines.days} ngày (${deadlines.upcomingCount})',
          deadlines.upcoming,
          AppColors.warning,
          'Không có công việc sắp đến hạn',
        ),
      ],
    );
  }

  Widget _line(String label, int value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Expanded(child: Text(label, style: const TextStyle(color: AppColors.textGrey))),
          Text('$value', style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _deadlineBlock(String title, List<Task> tasks, Color color, String emptyText) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: color)),
        const SizedBox(height: 4),
        Card(
          margin: EdgeInsets.zero,
          child: tasks.isEmpty
              ? Padding(
                  padding: const EdgeInsets.all(14),
                  child: Text(emptyText, style: const TextStyle(color: AppColors.textGrey)),
                )
              : Column(
                  children: [
                    for (final t in tasks)
                      ListTile(
                        dense: true,
                        title: Text(t.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                        subtitle: Text('${DateFormatter.date(t.dueDate)} · ${DateFormatter.dueHint(t.dueDate)}'),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => TaskDetailScreen(taskId: t.id)),
                          );
                          if (mounted) _load();
                        },
                      ),
                  ],
                ),
        ),
      ],
    );
  }
}

class _StatTile extends StatelessWidget {
  final String label;
  final int value;
  final Color color;

  const _StatTile({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Text('$value', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(height: 2),
          Text(label, style: TextStyle(fontSize: 12, color: color)),
        ],
      ),
    );
  }
}
