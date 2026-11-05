import '../models/task_share.dart';
import 'api_client.dart';

class TaskShareService {
  TaskShareService._();
  static final TaskShareService instance = TaskShareService._();

  final ApiClient _api = ApiClient.instance;

  Future<List<TaskShare>> list(String taskId) async {
    final data = await _api.get('/tasks/$taskId/shares');
    return ((data['shares'] as List?) ?? const [])
        .map((e) => TaskShare.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Chia sẻ cho [userId] với [permission] (viewer | editor). Nếu đã chia sẻ thì chỉ đổi quyền.
  Future<TaskShare> share(String taskId, String userId, String permission) async {
    final data = await _api.post('/tasks/$taskId/shares', body: {
      'userId': userId,
      'permission': permission,
    });
    return TaskShare.fromJson(data['share'] as Map<String, dynamic>);
  }

  Future<TaskShare> updatePermission(String taskId, String shareId, String permission) async {
    final data = await _api.patch('/tasks/$taskId/shares/$shareId', body: {'permission': permission});
    return TaskShare.fromJson(data['share'] as Map<String, dynamic>);
  }

  Future<void> revoke(String taskId, String shareId) async {
    await _api.delete('/tasks/$taskId/shares/$shareId');
  }
}
