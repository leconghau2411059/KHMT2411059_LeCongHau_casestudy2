/// Thông báo trong ứng dụng.
class AppNotification {
  final String id;
  final String? taskId;
  final String type;
  final String title;
  final String message;
  final bool isRead;
  final DateTime? createdAt;

  const AppNotification({
    required this.id,
    this.taskId,
    required this.type,
    required this.title,
    this.message = '',
    this.isRead = false,
    this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: (json['id'] ?? '').toString(),
      taskId: json['taskId']?.toString(),
      type: (json['type'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      message: (json['message'] ?? '').toString(),
      isRead: json['isRead'] == true,
      createdAt: json['createdAt'] == null ? null : DateTime.tryParse(json['createdAt'].toString())?.toLocal(),
    );
  }

  AppNotification copyWith({bool? isRead}) => AppNotification(
        id: id,
        taskId: taskId,
        type: type,
        title: title,
        message: message,
        isRead: isRead ?? this.isRead,
        createdAt: createdAt,
      );
}

/// Nhật ký gửi email của một công việc.
class EmailLogItem {
  final String id;
  final String to;
  final String subject;
  final String status; // pending | sending | sent | failed
  final int attempts;
  final bool canRetry;
  final String lastError;

  const EmailLogItem({
    required this.id,
    required this.to,
    required this.subject,
    required this.status,
    required this.attempts,
    required this.canRetry,
    this.lastError = '',
  });

  factory EmailLogItem.fromJson(Map<String, dynamic> json) {
    return EmailLogItem(
      id: (json['id'] ?? '').toString(),
      to: (json['to'] ?? '').toString(),
      subject: (json['subject'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      attempts: (json['attempts'] as num?)?.toInt() ?? 0,
      canRetry: json['canRetry'] == true,
      lastError: (json['lastError'] ?? '').toString(),
    );
  }

  String get statusLabel {
    switch (status) {
      case 'sent':
        return 'Đã gửi';
      case 'failed':
        return 'Gửi lỗi';
      case 'sending':
        return 'Đang gửi';
      default:
        return 'Chờ gửi';
    }
  }
}
