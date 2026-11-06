import '../models/statistics.dart';
import '../models/task_activity.dart';
import 'api_client.dart';

class StatisticsService {
  StatisticsService._();
  static final StatisticsService instance = StatisticsService._();

  final ApiClient _api = ApiClient.instance;

  Future<TaskStats> tasks() async {
    final data = await _api.get('/statistics/tasks');
    return TaskStats.fromJson(data['statistics'] as Map<String, dynamic>);
  }

  Future<AssignmentStats> assignments() async {
    final data = await _api.get('/statistics/assignments');
    return AssignmentStats.fromJson(data['statistics'] as Map<String, dynamic>);
  }

  Future<DeadlineStats> deadlines({int days = 7}) async {
    final data = await _api.get('/statistics/deadlines', query: {'days': days});
    return DeadlineStats.fromJson(data as Map<String, dynamic>);
  }

  Future<List<TaskActivity>> activities(String taskId) async {
    final data = await _api.get('/tasks/$taskId/activities');
    return ((data['activities'] as List?) ?? const [])
        .map((e) => TaskActivity.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
