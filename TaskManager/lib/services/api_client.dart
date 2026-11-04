import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../utils/constants.dart';

/// Lỗi trả về từ API hoặc lỗi kết nối; [message] đã là tiếng Việt, hiển thị được ngay.
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final Map<String, String> fieldErrors;

  const ApiException(this.message, {this.statusCode, this.fieldErrors = const {}});

  @override
  String toString() => message;
}

/// Gọi REST API, tự gắn token đăng nhập vào header.
class ApiClient {
  ApiClient._();
  static final ApiClient instance = ApiClient._();

  static const String _tokenKey = 'auth_token';

  String? _token;

  /// Được gọi khi server trả 401 trong lúc đang đăng nhập (token hết hạn / không hợp lệ).
  void Function()? onUnauthorized;

  bool get hasToken => _token != null && _token!.isNotEmpty;

  Future<void> loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString(_tokenKey);
  }

  Future<void> saveToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  Future<void> clearToken() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? query}) =>
      _send('GET', path, query: query);

  Future<dynamic> post(String path, {Object? body}) => _send('POST', path, body: body);

  Future<dynamic> put(String path, {Object? body}) => _send('PUT', path, body: body);

  Future<dynamic> patch(String path, {Object? body}) => _send('PATCH', path, body: body);

  Future<dynamic> delete(String path) => _send('DELETE', path);

  Uri _uri(String path, Map<String, dynamic>? query) {
    final params = <String, String>{};
    query?.forEach((key, value) {
      if (value != null && value.toString().isNotEmpty) params[key] = value.toString();
    });
    final uri = Uri.parse('${AppConstants.baseUrl}$path');
    return params.isEmpty ? uri : uri.replace(queryParameters: params);
  }

  Future<dynamic> _send(
    String method,
    String path, {
    Map<String, dynamic>? query,
    Object? body,
  }) async {
    final request = http.Request(method, _uri(path, query));
    request.headers['Accept'] = 'application/json';
    if (hasToken) request.headers['Authorization'] = 'Bearer $_token';
    if (body != null) {
      request.headers['Content-Type'] = 'application/json';
      request.body = jsonEncode(body);
    }

    http.Response response;
    try {
      final streamed = await request.send().timeout(AppConstants.requestTimeout);
      response = await http.Response.fromStream(streamed);
    } on TimeoutException {
      throw const ApiException('Máy chủ phản hồi quá chậm, vui lòng thử lại');
    } catch (_) {
      throw const ApiException(
        'Không thể kết nối tới máy chủ. Hãy kiểm tra mạng và chắc chắn API đang chạy',
      );
    }

    dynamic data;
    final text = utf8.decode(response.bodyBytes);
    if (text.isNotEmpty) {
      try {
        data = jsonDecode(text);
      } on FormatException {
        data = null;
      }
    }

    if (response.statusCode >= 200 && response.statusCode < 300) return data;

    final message = (data is Map && data['message'] is String)
        ? data['message'] as String
        : 'Đã xảy ra lỗi (mã ${response.statusCode})';

    final fieldErrors = <String, String>{};
    if (data is Map && data['errors'] is Map) {
      (data['errors'] as Map).forEach((key, value) {
        fieldErrors[key.toString()] = value.toString();
      });
    }

    if (response.statusCode == 401 && hasToken) {
      onUnauthorized?.call();
    }
    throw ApiException(message, statusCode: response.statusCode, fieldErrors: fieldErrors);
  }
}
