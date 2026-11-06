import 'task.dart';

class TaskStats {
  final int total;
  final Map<String, int> byStatus;
  final Map<String, int> byPriority;
  final int overdue;
  final int completionRate;

  const TaskStats({
    required this.total,
    required this.byStatus,
    required this.byPriority,
    required this.overdue,
    required this.completionRate,
  });

  static Map<String, int> _counts(dynamic raw) =>
      ((raw as Map?) ?? const {}).map((k, v) => MapEntry(k.toString(), (v as num?)?.toInt() ?? 0));

  factory TaskStats.fromJson(Map<String, dynamic> json) => TaskStats(
        total: (json['total'] as num?)?.toInt() ?? 0,
        byStatus: _counts(json['byStatus']),
        byPriority: _counts(json['byPriority']),
        overdue: (json['overdue'] as num?)?.toInt() ?? 0,
        completionRate: (json['completionRate'] as num?)?.toInt() ?? 0,
      );
}

class AssignmentStats {
  final int created;
  final int assigned;
  final int primaryResponsible;
  final int sharedWithMe;

  const AssignmentStats({
    required this.created,
    required this.assigned,
    required this.primaryResponsible,
    required this.sharedWithMe,
  });

  factory AssignmentStats.fromJson(Map<String, dynamic> json) => AssignmentStats(
        created: (json['created'] as num?)?.toInt() ?? 0,
        assigned: (json['assigned'] as num?)?.toInt() ?? 0,
        primaryResponsible: (json['primaryResponsible'] as num?)?.toInt() ?? 0,
        sharedWithMe: (json['sharedWithMe'] as num?)?.toInt() ?? 0,
      );
}

class DeadlineStats {
  final int days;
  final int overdueCount;
  final int upcomingCount;
  final List<Task> overdue;
  final List<Task> upcoming;

  const DeadlineStats({
    required this.days,
    required this.overdueCount,
    required this.upcomingCount,
    required this.overdue,
    required this.upcoming,
  });

  static List<Task> _tasks(dynamic raw) =>
      ((raw as List?) ?? const []).map((e) => Task.fromJson(e as Map<String, dynamic>)).toList();

  factory DeadlineStats.fromJson(Map<String, dynamic> json) => DeadlineStats(
        days: (json['days'] as num?)?.toInt() ?? 7,
        overdueCount: (json['overdueCount'] as num?)?.toInt() ?? 0,
        upcomingCount: (json['upcomingCount'] as num?)?.toInt() ?? 0,
        overdue: _tasks(json['overdue']),
        upcoming: _tasks(json['upcoming']),
      );
}
