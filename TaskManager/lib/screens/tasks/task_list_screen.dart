import 'dart:async';

import 'package:flutter/material.dart';

import '../../models/task.dart';
import '../../services/api_client.dart';
import '../../services/task_service.dart';
import '../../utils/constants.dart';
import '../../widgets/loading_view.dart';
import '../../widgets/task_card.dart';
import '../profile/profile_screen.dart';
import 'task_create_screen.dart';
import 'task_detail_screen.dart';

/// Màn hình 3: Danh sách công việc (phân loại, tìm kiếm, lọc, sắp xếp).
class TaskListScreen extends StatefulWidget {
  const TaskListScreen({super.key});

  @override
  State<TaskListScreen> createState() => _TaskListScreenState();
}

class _TaskListScreenState extends State<TaskListScreen> {
  static const List<(String, String?)> _scopes = [
    ('Tất cả', null),
    ('Tôi tạo', 'created'),
    ('Được giao', 'assigned'),
    ('Được chia sẻ', 'shared'),
  ];

  final _service = TaskService.instance;
  final _searchController = TextEditingController();
  Timer? _debounce;

  TaskQuery _query = const TaskQuery();
  List<Task> _tasks = [];
  int _total = 0;
  int _page = 1;
  bool _loading = true;
  bool _loadingMore = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = _tasks.isEmpty;
      _error = null;
    });
    try {
      final result = await _service.list(_query);
      if (!mounted) return;
      setState(() {
        _tasks = result.tasks;
        _total = result.total;
        _page = result.page;
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

  Future<void> _loadMore() async {
    if (_loadingMore) return;
    setState(() => _loadingMore = true);
    try {
      final result = await _service.list(_query, page: _page + 1);
      if (!mounted) return;
      setState(() {
        _tasks = [..._tasks, ...result.tasks];
        _total = result.total;
        _page = result.page;
      });
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  void _onSearchChanged(String text) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      _query = _query.copyWith(keyword: text.trim());
      _load();
    });
  }

  void _setScope(String? scope) {
    setState(() => _query = _query.copyWith(scope: scope));
    _load();
  }

  Future<void> _openFilters() async {
    final result = await showModalBottomSheet<TaskQuery>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _FilterSheet(initial: _query),
    );
    if (result != null) {
      setState(() => _query = result);
      _load();
    }
  }

  Future<void> _openDetail(Task task) async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => TaskDetailScreen(taskId: task.id)),
    );
    if (mounted) _load();
  }

  Future<void> _openCreate() async {
    final created = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => const TaskCreateScreen()),
    );
    if (created == true && mounted) _load();
  }

  bool get _hasActiveFilter =>
      _query.status != null || _query.priority != null || _query.sortBy != 'createdAt' || _query.order != null;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Công việc'),
        actions: [
          IconButton(
            icon: Badge(
              isLabelVisible: _hasActiveFilter,
              smallSize: 8,
              child: const Icon(Icons.filter_list),
            ),
            tooltip: 'Lọc và sắp xếp',
            onPressed: _openFilters,
          ),
          IconButton(
            icon: const Icon(Icons.person_outline),
            tooltip: 'Cá nhân',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const ProfileScreen()),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCreate,
        icon: const Icon(Icons.add),
        label: const Text('Thêm công việc'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: TextField(
              controller: _searchController,
              onChanged: _onSearchChanged,
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                hintText: 'Tìm công việc theo tên',
                prefixIcon: const Icon(Icons.search),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(vertical: 0),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              children: [
                for (final (label, scope) in _scopes)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                    child: ChoiceChip(
                      label: Text(label),
                      selected: _query.scope == scope,
                      onSelected: (_) => _setScope(scope),
                    ),
                  ),
              ],
            ),
          ),
          Expanded(child: _buildList()),
        ],
      ),
    );
  }

  Widget _buildList() {
    if (_loading) return const LoadingView();
    if (_error != null) return ErrorView(message: _error!, onRetry: _load);
    if (_tasks.isEmpty) {
      return const EmptyView(
        icon: Icons.task_outlined,
        message: 'Không có công việc nào.\nNhấn "Thêm công việc" để tạo mới.',
      );
    }

    final hasMore = _tasks.length < _total;
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
        itemCount: _tasks.length + (hasMore ? 1 : 0),
        itemBuilder: (context, index) {
          if (index >= _tasks.length) {
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Center(
                child: _loadingMore
                    ? const CircularProgressIndicator()
                    : TextButton(onPressed: _loadMore, child: const Text('Tải thêm')),
              ),
            );
          }
          final task = _tasks[index];
          return TaskCard(task: task, onTap: () => _openDetail(task));
        },
      ),
    );
  }
}

/// Bảng lọc theo trạng thái, ưu tiên và chọn cách sắp xếp.
class _FilterSheet extends StatefulWidget {
  final TaskQuery initial;

  const _FilterSheet({required this.initial});

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  late String? _status = widget.initial.status;
  late String? _priority = widget.initial.priority;
  late String _sortBy = widget.initial.sortBy;
  late String? _order = widget.initial.order;

  static const Map<String, String> _sortLabels = {
    'createdAt': 'Thời gian tạo',
    'dueDate': 'Hạn hoàn thành',
    'priority': 'Mức ưu tiên',
  };

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Lọc và sắp xếp', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            const Text('Trạng thái', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: [
                ChoiceChip(
                  label: const Text('Tất cả'),
                  selected: _status == null,
                  onSelected: (_) => setState(() => _status = null),
                ),
                for (final s in TaskOptions.statuses)
                  ChoiceChip(
                    label: Text(TaskOptions.statusLabel(s)),
                    selected: _status == s,
                    onSelected: (_) => setState(() => _status = s),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            const Text('Mức ưu tiên', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              children: [
                ChoiceChip(
                  label: const Text('Tất cả'),
                  selected: _priority == null,
                  onSelected: (_) => setState(() => _priority = null),
                ),
                for (final p in TaskOptions.priorities)
                  ChoiceChip(
                    label: Text(TaskOptions.priorityLabel(p)),
                    selected: _priority == p,
                    onSelected: (_) => setState(() => _priority = p),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            const Text('Sắp xếp theo', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: [
                for (final entry in _sortLabels.entries)
                  ChoiceChip(
                    label: Text(entry.value),
                    selected: _sortBy == entry.key,
                    onSelected: (_) => setState(() {
                      _sortBy = entry.key;
                      _order = null; // dùng thứ tự mặc định của trường vừa chọn
                    }),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                ChoiceChip(
                  label: const Text('Mặc định'),
                  selected: _order == null,
                  onSelected: (_) => setState(() => _order = null),
                ),
                ChoiceChip(
                  label: const Text('Tăng dần'),
                  selected: _order == 'asc',
                  onSelected: (_) => setState(() => _order = 'asc'),
                ),
                ChoiceChip(
                  label: const Text('Giảm dần'),
                  selected: _order == 'desc',
                  onSelected: (_) => setState(() => _order = 'desc'),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(
                      context,
                      widget.initial.copyWith(status: null, priority: null, sortBy: 'createdAt', order: null),
                    ),
                    child: const Text('Đặt lại'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(
                      context,
                      widget.initial.copyWith(
                        status: _status,
                        priority: _priority,
                        sortBy: _sortBy,
                        order: _order,
                      ),
                    ),
                    child: const Text('Áp dụng'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
