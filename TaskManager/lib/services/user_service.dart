import '../models/user.dart';
import 'api_client.dart';

class UserService {
  UserService._();
  static final UserService instance = UserService._();

  final ApiClient _api = ApiClient.instance;

  /// Tìm người dùng theo tên hoặc email (cần ít nhất 2 ký tự; server loại trừ chính mình).
  Future<List<User>> search(String keyword) async {
    final q = keyword.trim();
    if (q.length < 2) return const [];
    final data = await _api.get('/users/search', query: {'q': q});
    return ((data['users'] as List?) ?? const [])
        .map((e) => User.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
