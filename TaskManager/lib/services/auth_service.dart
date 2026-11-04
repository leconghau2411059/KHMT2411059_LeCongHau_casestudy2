import 'package:flutter/foundation.dart';

import '../models/user.dart';
import 'api_client.dart';

/// Đăng ký, đăng nhập, đăng xuất và quản lý thông tin cá nhân.
class AuthService {
  AuthService._();
  static final AuthService instance = AuthService._();

  final ApiClient _api = ApiClient.instance;

  /// Người dùng đang đăng nhập (null nếu chưa đăng nhập).
  final ValueNotifier<User?> currentUser = ValueNotifier<User?>(null);

  bool get isLoggedIn => currentUser.value != null;

  /// Gọi lúc mở app: đọc token đã lưu và kiểm tra còn hợp lệ không.
  Future<void> init() async {
    await _api.loadToken();
    if (!_api.hasToken) return;
    try {
      final data = await _api.get('/auth/me');
      currentUser.value = User.fromJson(data['user'] as Map<String, dynamic>);
    } on ApiException catch (e) {
      if (e.statusCode == 401) await _api.clearToken();
    }
  }

  Future<void> register({
    required String fullName,
    required String email,
    required String password,
    required String confirmPassword,
  }) async {
    await _api.post('/auth/register', body: {
      'fullName': fullName.trim(),
      'email': email.trim(),
      'password': password,
      'confirmPassword': confirmPassword,
    });
  }

  Future<User> login(String email, String password) async {
    final data = await _api.post('/auth/login', body: {
      'email': email.trim(),
      'password': password,
    });
    await _api.saveToken(data['token'] as String);
    final user = User.fromJson(data['user'] as Map<String, dynamic>);
    currentUser.value = user;
    return user;
  }

  Future<void> logout() async {
    await _api.clearToken();
    currentUser.value = null;
  }

  /// Dùng khi server báo token hết hạn: xóa phiên cục bộ.
  Future<void> clearSession() => logout();

  Future<User> updateProfile({String? fullName, String? avatarUrl}) async {
    final body = <String, dynamic>{};
    if (fullName != null) body['fullName'] = fullName.trim();
    if (avatarUrl != null) body['avatarUrl'] = avatarUrl.trim();
    final data = await _api.put('/auth/me', body: body);
    final user = User.fromJson(data['user'] as Map<String, dynamic>);
    currentUser.value = user;
    return user;
  }

  Future<void> changePassword(String currentPassword, String newPassword) async {
    await _api.put('/auth/change-password', body: {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    });
  }
}
