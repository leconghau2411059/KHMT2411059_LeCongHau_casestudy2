import 'user.dart';

class Task {
  final String id;
  final String title;
  final String description;
  final User? createdBy;
  final List<User> assignees;
  final User? primaryAssignee;
  final DateTime? startDate;
  final DateTime? dueDate;
  final String priority;
  final String status;
  final bool isOverdue;
  final DateTime? createdAt;

  /// Vai trò của người đang xem: owner | editor | viewer.
  final String? myRole;
  final List<String> relations;
  final bool canEdit;
  final bool canDelete;
  final bool canManage;

  const Task({
    required this.id,
    required this.title,
    this.description = '',
    this.createdBy,
    this.assignees = const [],
    this.primaryAssignee,
    this.startDate,
    this.dueDate,
    this.priority = 'medium',
    this.status = 'todo',
    this.isOverdue = false,
    this.createdAt,
    this.myRole,
    this.relations = const [],
    this.canEdit = false,
    this.canDelete = false,
    this.canManage = false,
  });

  factory Task.fromJson(Map<String, dynamic> json) {
    final permissions = json['permissions'];
    final perms = permissions is Map ? permissions : const {};

    return Task(
      id: (json['id'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      createdBy: json['createdBy'] is Map<String, dynamic>
          ? User.fromJson(json['createdBy'] as Map<String, dynamic>)
          : null,
      assignees: ((json['assignees'] as List?) ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(User.fromJson)
          .toList(),
      primaryAssignee: json['primaryAssignee'] is Map<String, dynamic>
          ? User.fromJson(json['primaryAssignee'] as Map<String, dynamic>)
          : null,
      startDate: _parseDate(json['startDate']),
      dueDate: _parseDate(json['dueDate']),
      priority: (json['priority'] ?? 'medium').toString(),
      status: (json['status'] ?? 'todo').toString(),
      isOverdue: json['isOverdue'] == true,
      createdAt: _parseDate(json['createdAt']),
      myRole: json['myRole'] as String?,
      relations: ((json['relations'] as List?) ?? const []).map((e) => e.toString()).toList(),
      canEdit: perms['canEdit'] == true,
      canDelete: perms['canDelete'] == true,
      canManage: perms['canManage'] == true,
    );
  }

  static DateTime? _parseDate(dynamic value) {
    if (value is! String || value.isEmpty) return null;
    return DateTime.tryParse(value)?.toLocal();
  }
}
