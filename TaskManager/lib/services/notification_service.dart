import '../models/app_notification.dart';
import 'api_client.dart';

class NotificationPage {
  final List<AppNotification> items;
  final int total;
  final int unreadCount;

  const NotificationPage({required this.items, required this.total, required this.unreadCount});
}

class NotificationService {
  NotificationService._();
  static final NotificationService instance = NotificationService._();

  final ApiClient _api = ApiClient.instance;

  Future<NotificationPage> list({int page = 1, int limit = 50}) async {
    final data = await _api.get('/notifications', query: {'page': page, 'limit': limit});
    final items = ((data['notifications'] as List?) ?? const [])
        .map((e) => AppNotification.fromJson(e as Map<String, dynamic>))
        .toList();
    return NotificationPage(
      items: items,
      total: (data['total'] as num?)?.toInt() ?? items.length,
      unreadCount: (data['unreadCount'] as num?)?.toInt() ?? 0,
    );
  }

  Future<int> unreadCount() async {
    final data = await _api.get('/notifications/unread-count');
    return (data['unreadCount'] as num?)?.toInt() ?? 0;
  }

  Future<void> markRead(String id) async {
    await _api.patch('/notifications/$id/read');
  }

  Future<void> markAllRead() async {
    await _api.patch('/notifications/read-all');
  }

  Future<List<EmailLogItem>> emailLogs(String taskId) async {
    final data = await _api.get('/tasks/$taskId/email-logs');
    return ((data['emailLogs'] as List?) ?? const [])
        .map((e) => EmailLogItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<EmailLogItem> retryEmail(String logId) async {
    final data = await _api.post('/email-logs/$logId/retry');
    return EmailLogItem.fromJson(data['emailLog'] as Map<String, dynamic>);
  }
}
