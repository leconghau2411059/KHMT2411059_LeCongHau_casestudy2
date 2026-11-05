import 'user.dart';

/// Một bản ghi chia sẻ công việc cho người khác (viewer hoặc editor).
class TaskShare {
  final String id;
  final User user;
  final String permission; // viewer | editor
  final User? sharedBy;

  const TaskShare({
    required this.id,
    required this.user,
    required this.permission,
    this.sharedBy,
  });

  factory TaskShare.fromJson(Map<String, dynamic> json) {
    return TaskShare(
      id: (json['id'] ?? '').toString(),
      user: User.fromJson((json['user'] as Map?)?.cast<String, dynamic>() ?? const {}),
      permission: (json['permission'] ?? 'viewer').toString(),
      sharedBy: json['sharedBy'] is Map
          ? User.fromJson((json['sharedBy'] as Map).cast<String, dynamic>())
          : null,
    );
  }
}

/// Người được giao việc, kèm cờ người phụ trách chính.
class Assignee {
  final User user;
  final bool isPrimary;

  const Assignee({required this.user, this.isPrimary = false});

  factory Assignee.fromJson(Map<String, dynamic> json) {
    return Assignee(user: User.fromJson(json), isPrimary: json['isPrimary'] == true);
  }
}
