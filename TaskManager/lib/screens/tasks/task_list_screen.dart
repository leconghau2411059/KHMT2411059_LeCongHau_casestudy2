import 'package:flutter/material.dart';

import '../../models/user.dart';
import '../../services/auth_service.dart';
import '../../utils/constants.dart';
import '../profile/profile_screen.dart';

/// Màn hình 3: Danh sách công việc.
/// Ở nhánh a-xac-thuc đây mới là màn hình chờ sau khi đăng nhập; nhánh b-cong-viec sẽ làm đầy đủ.
class TaskListScreen extends StatelessWidget {
  const TaskListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Công việc'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline),
            tooltip: 'Cá nhân',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const ProfileScreen()),
            ),
          ),
        ],
      ),
      body: Center(
        child: ValueListenableBuilder<User?>(
          valueListenable: AuthService.instance.currentUser,
          builder: (context, user, _) => Text(
            'Xin chào, ${user?.fullName ?? ''}',
            style: const TextStyle(fontSize: 18),
          ),
        ),
      ),
    );
  }
}
