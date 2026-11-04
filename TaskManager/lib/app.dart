import 'package:flutter/material.dart';

import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/tasks/task_list_screen.dart';
import 'services/api_client.dart';
import 'services/auth_service.dart';
import 'utils/constants.dart';

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

class TaskManagerApp extends StatefulWidget {
  const TaskManagerApp({super.key});

  @override
  State<TaskManagerApp> createState() => _TaskManagerAppState();
}

class _TaskManagerAppState extends State<TaskManagerApp> {
  bool _handlingUnauthorized = false;

  @override
  void initState() {
    super.initState();
    // Token hết hạn / không hợp lệ: xóa phiên và quay về màn hình đăng nhập.
    ApiClient.instance.onUnauthorized = () async {
      if (_handlingUnauthorized) return;
      _handlingUnauthorized = true;
      await AuthService.instance.clearSession();
      navigatorKey.currentState?.pushNamedAndRemoveUntil('/login', (route) => false);
      _handlingUnauthorized = false;
    };
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Task Manager',
      debugShowCheckedModeBanner: false,
      navigatorKey: navigatorKey,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: AppColors.primary),
        scaffoldBackgroundColor: Colors.white,
        useMaterial3: true,
      ),
      initialRoute: AuthService.instance.isLoggedIn ? '/tasks' : '/login',
      routes: {
        '/login': (_) => const LoginScreen(),
        '/register': (_) => const RegisterScreen(),
        '/tasks': (_) => const TaskListScreen(),
      },
    );
  }
}
