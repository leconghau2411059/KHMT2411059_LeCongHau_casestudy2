import 'user.dart';

/// Một dòng trong lịch sử hoạt động của công việc.
class TaskActivity {
  final String id;
  final User? user;
  final String action;
  final Map<String, dynamic> details;
  final DateTime? createdAt;

  const TaskActivity({
    required this.id,
    this.user,
    required this.action,
    this.details = const {},
    this.createdAt,
  });

  factory TaskActivity.fromJson(Map<String, dynamic> json) {
    return TaskActivity(
      id: (json['id'] ?? '').toString(),
      user: json['user'] is Map ? User.fromJson((json['user'] as Map).cast<String, dynamic>()) : null,
      action: (json['action'] ?? '').toString(),
      details: (json['details'] as Map?)?.cast<String, dynamic>() ?? const {},
      createdAt: json['createdAt'] == null ? null : DateTime.tryParse(json['createdAt'].toString())?.toLocal(),
    );
  }

  static const _statusNames = {
    'todo': 'Cần làm',
    'in_progress': 'Đang làm',
    'completed': 'Hoàn thành',
  };

  static const _fieldNames = {
    'title': 'tên',
    'description': 'mô tả',
    'priority': 'mức ưu tiên',
    'startDate': 'ngày bắt đầu',
    'dueDate': 'hạn hoàn thành',
  };

  /// Mô tả hoạt động bằng tiếng Việt (không kèm tên người thực hiện).
  String get description {
    switch (action) {
      case 'created':
        return 'đã tạo công việc';
      case 'status_changed':
        final from = _statusNames[details['from']] ?? '${details['from']}';
        final to = _statusNames[details['to']] ?? '${details['to']}';
        return 'đổi trạng thái: $from → $to';
      case 'updated':
        final changes = details['changes'];
        if (changes is Map && changes.isNotEmpty) {
          final names = changes.keys.map((k) => _fieldNames[k] ?? k.toString()).join(', ');
          return 'cập nhật $names';
        }
        return 'cập nhật công việc';
      case 'assigned':
        return 'đã giao việc cho ${details['fullName'] ?? 'một người'}';
      case 'unassigned':
        return 'đã gỡ một người phụ trách';
      case 'primary_changed':
        return 'đổi người phụ trách chính';
      case 'shared':
        return 'đã chia sẻ cho ${details['fullName'] ?? 'một người'}';
      case 'share_updated':
        return 'đã đổi quyền truy cập của một người';
      case 'share_revoked':
        return 'đã thu hồi quyền truy cập của một người';
      default:
        return action;
    }
  }
}
