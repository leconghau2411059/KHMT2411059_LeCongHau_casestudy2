import '../models/task.dart';
import 'api_client.dart';

/// Một trang kết quả danh sách công việc.
class TaskPage {
  final List<Task> tasks;
  final int total;
  final int page;

  const TaskPage({required this.tasks, required this.total, required this.page});

  bool get hasMore => tasks.length < total;
}

/// Bộ lọc / sắp xếp cho danh sách công việc.
class TaskQuery {
  final String? scope; // created | assigned | shared (null: tất cả)
  final String? status;
  final String? priority;
  final String? keyword;
  final String sortBy; // createdAt | dueDate | priority
  final String? order; // asc | desc (null: mặc định theo sortBy)

  const TaskQuery({
    this.scope,
    this.status,
    this.priority,
    this.keyword,
    this.sortBy = 'createdAt',
    this.order,
  });

  TaskQuery copyWith({
    Object? scope = _keep,
    Object? status = _keep,
    Object? priority = _keep,
    Object? keyword = _keep,
    String? sortBy,
    Object? order = _keep,
  }) {
    return TaskQuery(
      scope: identical(scope, _keep) ? this.scope : scope as String?,
      status: identical(status, _keep) ? this.status : status as String?,
      priority: identical(priority, _keep) ? this.priority : priority as String?,
      keyword: identical(keyword, _keep) ? this.keyword : keyword as String?,
      sortBy: sortBy ?? this.sortBy,
      order: identical(order, _keep) ? this.order : order as String?,
    );
  }

  static const Object _keep = Object();
}

class TaskService {
  TaskService._();
  static final TaskService instance = TaskService._();

  final ApiClient _api = ApiClient.instance;

  Future<TaskPage> list(TaskQuery query, {int page = 1, int limit = 30}) async {
    final data = await _api.get('/tasks', query: {
      'scope': query.scope,
      'status': query.status,
      'priority': query.priority,
      'q': query.keyword,
      'sortBy': query.sortBy,
      'order': query.order,
      'page': page,
      'limit': limit,
    });
    final tasks = ((data['tasks'] as List?) ?? const [])
        .map((e) => Task.fromJson(e as Map<String, dynamic>))
        .toList();
    return TaskPage(
      tasks: tasks,
      total: (data['total'] as num?)?.toInt() ?? tasks.length,
      page: (data['page'] as num?)?.toInt() ?? page,
    );
  }

  Future<Task> get(String id) async {
    final data = await _api.get('/tasks/$id');
    return Task.fromJson(data['task'] as Map<String, dynamic>);
  }

  /// [fields]: title, description, priority, status, startDate, dueDate (ISO hoặc null).
  Future<Task> create(Map<String, dynamic> fields) async {
    final data = await _api.post('/tasks', body: fields);
    return Task.fromJson(data['task'] as Map<String, dynamic>);
  }

  Future<Task> update(String id, Map<String, dynamic> fields) async {
    final data = await _api.put('/tasks/$id', body: fields);
    return Task.fromJson(data['task'] as Map<String, dynamic>);
  }

  Future<Task> updateStatus(String id, String status) async {
    final data = await _api.patch('/tasks/$id/status', body: {'status': status});
    return Task.fromJson(data['task'] as Map<String, dynamic>);
  }

  Future<void> delete(String id) async {
    await _api.delete('/tasks/$id');
  }
}
