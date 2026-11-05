import 'dart:async';

import 'package:flutter/material.dart';

import '../models/user.dart';
import '../screens/profile/profile_screen.dart' show UserAvatar;
import '../services/api_client.dart';
import '../services/user_service.dart';
import '../utils/constants.dart';

/// Hộp thoại chọn người dùng: tìm theo tên hoặc email.
/// Trả về danh sách người được chọn, hoặc null nếu hủy.
/// [excludeIds]: những người không hiển thị (đã được giao / đã chia sẻ).
Future<List<User>?> showUserSelector(
  BuildContext context, {
  required String title,
  bool multiple = true,
  Set<String> excludeIds = const {},
}) {
  return showDialog<List<User>>(
    context: context,
    builder: (_) => _UserSelectorDialog(title: title, multiple: multiple, excludeIds: excludeIds),
  );
}

class _UserSelectorDialog extends StatefulWidget {
  final String title;
  final bool multiple;
  final Set<String> excludeIds;

  const _UserSelectorDialog({
    required this.title,
    required this.multiple,
    required this.excludeIds,
  });

  @override
  State<_UserSelectorDialog> createState() => _UserSelectorDialogState();
}

class _UserSelectorDialogState extends State<_UserSelectorDialog> {
  final _controller = TextEditingController();
  Timer? _debounce;
  final Map<String, User> _selected = {};
  List<User> _results = [];
  bool _searching = false;
  String? _error;
  String _lastQuery = '';

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String text) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () => _search(text));
  }

  Future<void> _search(String text) async {
    final query = text.trim();
    setState(() {
      _lastQuery = query;
      _error = null;
    });
    if (query.length < 2) {
      setState(() {
        _results = [];
        _searching = false;
      });
      return;
    }
    setState(() => _searching = true);
    try {
      final users = await UserService.instance.search(query);
      if (!mounted || query != _lastQuery) return; // bỏ kết quả của lần tìm cũ
      setState(() {
        _results = users.where((u) => !widget.excludeIds.contains(u.id)).toList();
        _searching = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _searching = false;
      });
    }
  }

  void _toggle(User user) {
    if (!widget.multiple) {
      Navigator.pop(context, [user]);
      return;
    }
    setState(() {
      if (_selected.containsKey(user.id)) {
        _selected.remove(user.id);
      } else {
        _selected[user.id] = user;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.title),
      content: SizedBox(
        width: double.maxFinite,
        height: 360,
        child: Column(
          children: [
            TextField(
              controller: _controller,
              autofocus: true,
              onChanged: _onChanged,
              decoration: const InputDecoration(
                hintText: 'Nhập tên hoặc email (ít nhất 2 ký tự)',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
              ),
            ),
            if (_selected.isNotEmpty) ...[
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerLeft,
                child: Wrap(
                  spacing: 6,
                  runSpacing: 0,
                  children: [
                    for (final u in _selected.values)
                      InputChip(
                        label: Text(u.fullName),
                        onDeleted: () => setState(() => _selected.remove(u.id)),
                      ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 8),
            Expanded(child: _buildResults()),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Hủy')),
        if (widget.multiple)
          ElevatedButton(
            onPressed: _selected.isEmpty ? null : () => Navigator.pop(context, _selected.values.toList()),
            child: Text('Chọn (${_selected.length})'),
          ),
      ],
    );
  }

  Widget _buildResults() {
    if (_searching) return const Center(child: CircularProgressIndicator());
    if (_error != null) {
      return Center(child: Text(_error!, style: const TextStyle(color: AppColors.danger)));
    }
    if (_lastQuery.length < 2) {
      return const Center(
        child: Text('Nhập từ khóa để tìm người dùng', style: TextStyle(color: AppColors.textGrey)),
      );
    }
    if (_results.isEmpty) {
      return const Center(
        child: Text('Không tìm thấy người dùng phù hợp', style: TextStyle(color: AppColors.textGrey)),
      );
    }
    return ListView.builder(
      itemCount: _results.length,
      itemBuilder: (context, i) {
        final user = _results[i];
        final selected = _selected.containsKey(user.id);
        return ListTile(
          dense: true,
          leading: UserAvatar(user: user, radius: 18),
          title: Text(user.fullName),
          subtitle: Text(user.email),
          trailing: widget.multiple && selected
              ? const Icon(Icons.check_circle, color: AppColors.primary)
              : null,
          onTap: () => _toggle(user),
        );
      },
    );
  }
}
