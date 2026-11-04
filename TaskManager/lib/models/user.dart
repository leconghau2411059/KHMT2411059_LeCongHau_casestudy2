class User {
  final String id;
  final String fullName;
  final String email;
  final String avatarUrl;

  const User({
    required this.id,
    required this.fullName,
    required this.email,
    this.avatarUrl = '',
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: (json['id'] ?? '').toString(),
      fullName: (json['fullName'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      avatarUrl: (json['avatarUrl'] ?? '').toString(),
    );
  }

  /// Chữ cái đầu của họ tên, dùng cho ảnh đại diện mặc định.
  String get initial {
    final name = fullName.trim();
    return name.isEmpty ? '?' : name.substring(0, 1).toUpperCase();
  }
}
