import 'package:flutter/material.dart';

import '../models/task.dart';
import '../utils/constants.dart';
import '../utils/date_formatter.dart';
import 'priority_badge.dart';
import 'status_badge.dart';

/// Thẻ công việc trong danh sách.
class TaskCard extends StatelessWidget {
  final Task task;
  final VoidCallback? onTap;

  const TaskCard({super.key, required this.task, this.onTap});

  @override
  Widget build(BuildContext context) {
    final overdue = task.isOverdue;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: overdue ? AppColors.danger.withValues(alpha: 0.5) : Colors.grey.shade200),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                task.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  decoration: task.status == 'completed' ? TextDecoration.lineThrough : null,
                  color: task.status == 'completed' ? AppColors.textGrey : AppColors.textDark,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  StatusBadge(status: task.status),
                  PriorityBadge(priority: task.priority),
                  if (task.myRole != null && task.myRole != 'owner')
                    Text(
                      TaskOptions.roleLabel(task.myRole),
                      style: const TextStyle(fontSize: 12, color: AppColors.textGrey),
                    ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Icon(
                    Icons.event,
                    size: 15,
                    color: overdue ? AppColors.danger : AppColors.textGrey,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    task.dueDate == null
                        ? 'Không có hạn'
                        : '${DateFormatter.date(task.dueDate)} · ${DateFormatter.dueHint(task.dueDate)}',
                    style: TextStyle(
                      fontSize: 12,
                      color: overdue ? AppColors.danger : AppColors.textGrey,
                      fontWeight: overdue ? FontWeight.w600 : FontWeight.normal,
                    ),
                  ),
                  const Spacer(),
                  if (task.assignees.isNotEmpty) ...[
                    const Icon(Icons.people_outline, size: 15, color: AppColors.textGrey),
                    const SizedBox(width: 4),
                    Text(
                      '${task.assignees.length}',
                      style: const TextStyle(fontSize: 12, color: AppColors.textGrey),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
