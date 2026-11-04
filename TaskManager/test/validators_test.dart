import 'package:flutter_test/flutter_test.dart';
import 'package:task_manager/utils/validators.dart';

void main() {
  group('Validators', () {
    test('email', () {
      expect(Validators.email(''), isNotNull);
      expect(Validators.email('khong-phai-email'), isNotNull);
      expect(Validators.email('a@b.co'), isNull);
    });

    test('mật khẩu cần 8 ký tự trở lên, có chữ và số', () {
      expect(Validators.password('123'), isNotNull);
      expect(Validators.password('chiconchu'), isNotNull);
      expect(Validators.password('12345678'), isNotNull);
      expect(Validators.password('abc12345'), isNull);
    });

    test('xác nhận mật khẩu', () {
      expect(Validators.confirmPassword('abc', 'abd'), isNotNull);
      expect(Validators.confirmPassword('abc12345', 'abc12345'), isNull);
    });

    test('họ tên', () {
      expect(Validators.fullName('A'), isNotNull);
      expect(Validators.fullName('Lê Công Hậu'), isNull);
    });

    test('đường dẫn ảnh', () {
      expect(Validators.avatarUrl(''), isNull);
      expect(Validators.avatarUrl('ftp://x'), isNotNull);
      expect(Validators.avatarUrl('https://x.com/a.png'), isNull);
    });
  });
}
