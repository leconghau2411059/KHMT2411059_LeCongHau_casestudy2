import 'package:flutter/material.dart';

import '../../models/task.dart';
import '../../services/task_service.dart';
import '../../widgets/task_form.dart';

/// Màn hình 6: Chỉnh sửa công việc.
class TaskEditScreen extends StatelessWidget {
  final Task task;

  const TaskEditScreen({super.key, required this.task});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Chỉnh sửa công việc')),
      body: SafeArea(
        child: TaskForm(
          initial: task,
          submitLabel: 'Lưu thay đổi',
          onSubmit: (data) async {
            await TaskService.instance.update(task.id, data);
            if (!context.mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Đã cập nhật công việc')),
            );
            Navigator.pop(context, true);
          },
        ),
      ),
    );
  }
}
