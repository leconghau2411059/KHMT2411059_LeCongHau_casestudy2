import 'package:intl/intl.dart';

class DateFormatter {
  DateFormatter._();

  static final DateFormat _date = DateFormat('dd/MM/yyyy');
  static final DateFormat _dateTime = DateFormat('HH:mm dd/MM/yyyy');

  /// 05/11/2026, hoặc "Chưa đặt" nếu null.
  static String date(DateTime? value, {String empty = 'Chưa đặt'}) {
    if (value == null) return empty;
    return _date.format(value.toLocal());
  }

  static String dateTime(DateTime? value, {String empty = ''}) {
    if (value == null) return empty;
    return _dateTime.format(value.toLocal());
  }

  /// Ngày bắt đầu: đầu ngày theo giờ máy.
  static DateTime startOfDay(DateTime d) => DateTime(d.year, d.month, d.day);

  /// Hạn hoàn thành: cuối ngày (23:59) để công việc không bị coi là quá hạn từ đầu ngày.
  static DateTime endOfDay(DateTime d) => DateTime(d.year, d.month, d.day, 23, 59);

  /// Chuỗi ISO 8601 (UTC) để gửi cho API.
  static String toApi(DateTime d) => d.toUtc().toIso8601String();

  /// "Còn 3 ngày", "Hôm nay", "Quá hạn 2 ngày"...
  static String dueHint(DateTime? due, {DateTime? now}) {
    if (due == null) return '';
    final current = now ?? DateTime.now();
    final today = DateTime(current.year, current.month, current.day);
    final dueDay = DateTime(due.toLocal().year, due.toLocal().month, due.toLocal().day);
    final days = dueDay.difference(today).inDays;
    if (days == 0) return 'Hạn hôm nay';
    if (days > 0) return 'Còn $days ngày';
    return 'Quá hạn ${-days} ngày';
  }
}
