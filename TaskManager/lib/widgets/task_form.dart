import 'package:flutter/material.dart';

import '../models/task.dart';
import '../services/api_client.dart';
import '../utils/constants.dart';
import '../utils/date_formatter.dart';
import '../utils/validators.dart';

/// Form dùng chung cho màn hình Thêm và Chỉnh sửa công việc.
/// [onSubmit] nhận dữ liệu đã đóng gói sẵn để gửi API; ném ApiException nếu thất bại.
class TaskForm extends StatefulWidget {
  final Task? initial;
  final String submitLabel;
  final Future<void> Function(Map<String, dynamic> data) onSubmit;

  const TaskForm({
    super.key,
    this.initial,
    required this.submitLabel,
    required this.onSubmit,
  });

  @override
  State<TaskForm> createState() => _TaskFormState();
}

class _TaskFormState extends State<TaskForm> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _titleController;
  late final TextEditingController _descController;
  DateTime? _startDate;
  DateTime? _dueDate;
  late String _priority;
  late String _status;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final t = widget.initial;
    _titleController = TextEditingController(text: t?.title ?? '');
    _descController = TextEditingController(text: t?.description ?? '');
    _startDate = t?.startDate;
    _dueDate = t?.dueDate;
    _priority = t?.priority ?? 'medium';
    _status = t?.status ?? 'todo';
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
  }

  Future<DateTime?> _pickDate(DateTime? current) {
    return showDatePicker(
      context: context,
      initialDate: current ?? DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_startDate != null && _dueDate != null && _dueDate!.isBefore(_startDate!)) {
      setState(() => _error = 'Hạn hoàn thành phải sau hoặc bằng ngày bắt đầu');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await widget.onSubmit({
        'title': _titleController.text.trim(),
        'description': _descController.text.trim(),
        'priority': _priority,
        'status': _status,
        'startDate': _startDate == null ? null : DateFormatter.toApi(_startDate!),
        'dueDate': _dueDate == null ? null : DateFormatter.toApi(_dueDate!),
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.fieldErrors.values.isNotEmpty ? e.fieldErrors.values.first : e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextFormField(
            controller: _titleController,
            maxLength: 200,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(
              labelText: 'Tên công việc *',
              border: OutlineInputBorder(),
            ),
            validator: (v) => Validators.requiredField(v, 'Tên công việc'),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _descController,
            maxLines: 4,
            maxLength: 5000,
            decoration: const InputDecoration(
              labelText: 'Mô tả',
              alignLabelWithHint: true,
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          _DateField(
            label: 'Ngày bắt đầu',
            value: _startDate,
            onPick: () async {
              final picked = await _pickDate(_startDate);
              if (picked != null) setState(() => _startDate = DateFormatter.startOfDay(picked));
            },
            onClear: () => setState(() => _startDate = null),
          ),
          const SizedBox(height: 12),
          _DateField(
            label: 'Hạn hoàn thành',
            value: _dueDate,
            onPick: () async {
              final picked = await _pickDate(_dueDate);
              if (picked != null) setState(() => _dueDate = DateFormatter.endOfDay(picked));
            },
            onClear: () => setState(() => _dueDate = null),
          ),
          const SizedBox(height: 20),
          const Text('Mức độ ưu tiên', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              for (final p in TaskOptions.priorities)
                ChoiceChip(
                  label: Text(TaskOptions.priorityLabel(p)),
                  selected: _priority == p,
                  onSelected: (_) => setState(() => _priority = p),
                ),
            ],
          ),
          const SizedBox(height: 16),
          const Text('Trạng thái', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              for (final s in TaskOptions.statuses)
                ChoiceChip(
                  label: Text(TaskOptions.statusLabel(s)),
                  selected: _status == s,
                  onSelected: (_) => setState(() => _status = s),
                ),
            ],
          ),
          if (_error != null) ...[
            const SizedBox(height: 16),
            Text(_error!, style: const TextStyle(color: AppColors.danger)),
          ],
          const SizedBox(height: 24),
          SizedBox(
            height: 50,
            child: ElevatedButton(
              onPressed: _loading ? null : _submit,
              child: _loading
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(widget.submitLabel),
            ),
          ),
        ],
      ),
    );
  }
}

class _DateField extends StatelessWidget {
  final String label;
  final DateTime? value;
  final VoidCallback onPick;
  final VoidCallback onClear;

  const _DateField({
    required this.label,
    required this.value,
    required this.onPick,
    required this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onPick,
      borderRadius: BorderRadius.circular(4),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          border: const OutlineInputBorder(),
          suffixIcon: value == null
              ? const Icon(Icons.calendar_today_outlined)
              : IconButton(
                  icon: const Icon(Icons.clear),
                  tooltip: 'Xóa ngày',
                  onPressed: onClear,
                ),
        ),
        child: Text(
          DateFormatter.date(value),
          style: TextStyle(color: value == null ? AppColors.textGrey : AppColors.textDark),
        ),
      ),
    );
  }
}
