import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

class AppConstants {
  AppConstants._();

  /// Địa chỉ API. Có thể ghi đè khi chạy:
  ///   flutter run --dart-define=API_BASE_URL=http://192.168.1.10:3000/api
  /// Máy ảo Android thấy máy tính qua địa chỉ 10.0.2.2 (không phải localhost).
  static const String _override = String.fromEnvironment('API_BASE_URL');

  static String get baseUrl {
    if (_override.isNotEmpty) return _override;
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3000/api';
    }
    return 'http://localhost:3000/api';
  }

  static const Duration requestTimeout = Duration(seconds: 15);
}

class AppColors {
  AppColors._();

  static const Color primary = Color(0xFF1D61E7);
  static const Color background = Color(0xFFF6F7FB);
  static const Color textDark = Color(0xFF0F172A);
  static const Color textGrey = Color(0xFF6B7280);
  static const Color danger = Color(0xFFE53935);
  static const Color success = Color(0xFF2E9E3E);
  static const Color warning = Color(0xFFF59E0B);
}

/// Nhãn và màu cho trạng thái, mức ưu tiên, vai trò của công việc.
class TaskOptions {
  TaskOptions._();

  static const List<String> statuses = ['todo', 'in_progress', 'completed'];
  static const List<String> priorities = ['low', 'medium', 'high'];

  static String statusLabel(String status) {
    switch (status) {
      case 'in_progress':
        return 'Đang thực hiện';
      case 'completed':
        return 'Đã hoàn thành';
      default:
        return 'Chưa thực hiện';
    }
  }

  static Color statusColor(String status) {
    switch (status) {
      case 'in_progress':
        return AppColors.primary;
      case 'completed':
        return AppColors.success;
      default:
        return AppColors.textGrey;
    }
  }

  static String priorityLabel(String priority) {
    switch (priority) {
      case 'low':
        return 'Thấp';
      case 'high':
        return 'Cao';
      default:
        return 'Trung bình';
    }
  }

  static Color priorityColor(String priority) {
    switch (priority) {
      case 'low':
        return const Color(0xFF64748B);
      case 'high':
        return AppColors.danger;
      default:
        return AppColors.warning;
    }
  }

  static String roleLabel(String? role) {
    switch (role) {
      case 'owner':
        return 'Người tạo';
      case 'editor':
        return 'Được phép sửa';
      case 'viewer':
        return 'Chỉ xem';
      default:
        return '';
    }
  }
}
