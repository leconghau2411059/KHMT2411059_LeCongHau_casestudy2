import 'package:flutter/material.dart';

import '../../services/task_service.dart';
import '../../widgets/task_form.dart';

/// Màn hình 5: Thêm công việc.
class TaskCreateScreen extends StatelessWidget {
  const TaskCreateScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Thêm công việc')),
      body: SafeArea(
        child: TaskForm(
          submitLabel: 'Tạo công việc',
          onSubmit: (data) async {
            await TaskService.instance.create(data);
            if (!context.mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Đã tạo công việc')),
            );
            Navigator.pop(context, true);
          },
        ),
      ),
    );
  }
}
