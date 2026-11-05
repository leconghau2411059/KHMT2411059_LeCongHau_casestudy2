import '../models/task_share.dart';
import '../models/user.dart';
import 'api_client.dart';

/// Kết quả giao việc: danh sách mới và các email không tìm thấy.
class AssignResult {
  final List<Assignee> assignees;
  final List<String> notFound;
  final int addedCount;

  const AssignResult({
    required this.assignees,
    required this.notFound,
    required this.addedCount,
  });
}

class AssignmentService {
  AssignmentService._();
  static final AssignmentService instance = AssignmentService._();

  final ApiClient _api = ApiClient.instance;

  List<Assignee> _parse(dynamic raw) => ((raw as List?) ?? const [])
      .map((e) => Assignee.fromJson(e as Map<String, dynamic>))
      .toList();

  Future<List<Assignee>> list(String taskId) async {
    final data = await _api.get('/tasks/$taskId/assignees');
    return _parse(data['assignees']);
  }

  Future<AssignResult> assign(String taskId, List<User> users, {String? primaryUserId}) async {
    final data = await _api.post('/tasks/$taskId/assignees', body: {
      'userIds': users.map((u) => u.id).toList(),
      if (primaryUserId != null) 'primaryUserId': primaryUserId,
    });
    return AssignResult(
      assignees: _parse(data['assignees']),
      notFound: ((data['notFound'] as List?) ?? const []).map((e) => e.toString()).toList(),
      addedCount: ((data['added'] as List?) ?? const []).length,
    );
  }

  Future<List<Assignee>> setPrimary(String taskId, String userId) async {
    final data = await _api.patch('/tasks/$taskId/assignees/$userId', body: {'isPrimary': true});
    return _parse(data['assignees']);
  }

  Future<void> remove(String taskId, String userId) async {
    await _api.delete('/tasks/$taskId/assignees/$userId');
  }
}
