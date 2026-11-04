/// Các hàm kiểm tra dữ liệu nhập trong form (trả về null nếu hợp lệ).
class Validators {
  Validators._();

  static final RegExp _emailRegex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

  static String? requiredField(String? value, [String label = 'Trường này']) {
    if (value == null || value.trim().isEmpty) return '$label không được để trống';
    return null;
  }

  static String? fullName(String? value) {
    final v = value?.trim() ?? '';
    if (v.length < 2 || v.length > 100) return 'Họ tên phải từ 2 đến 100 ký tự';
    return null;
  }

  static String? email(String? value) {
    final v = value?.trim() ?? '';
    if (v.isEmpty) return 'Vui lòng nhập email';
    if (!_emailRegex.hasMatch(v)) return 'Email không hợp lệ';
    return null;
  }

  /// Mật khẩu: 8-72 ký tự, có ít nhất một chữ và một số.
  static String? password(String? value) {
    final v = value ?? '';
    if (v.length < 8 || v.length > 72) return 'Mật khẩu phải từ 8 đến 72 ký tự';
    if (!RegExp(r'[A-Za-z]').hasMatch(v) || !RegExp(r'[0-9]').hasMatch(v)) {
      return 'Mật khẩu phải có cả chữ và số';
    }
    return null;
  }

  static String? confirmPassword(String? value, String original) {
    if (value == null || value.isEmpty) return 'Vui lòng nhập lại mật khẩu';
    if (value != original) return 'Xác nhận mật khẩu không khớp';
    return null;
  }

  static String? avatarUrl(String? value) {
    final v = value?.trim() ?? '';
    if (v.isEmpty) return null;
    if (!RegExp(r'^https?://', caseSensitive: false).hasMatch(v)) {
      return 'Đường dẫn phải bắt đầu bằng http:// hoặc https://';
    }
    return null;
  }
}
