class ApiEndpoints {
  ApiEndpoints._();

  // Change this to your backend host (e.g. 10.0.2.2 for Android emulator, localhost, or production URL)
  static String defaultBaseUrl = 'http://api.schoollinx.com/api';

  // Auth endpoints
  static const String login = '/auth/login';
  static const String logout = '/auth/logout';
  static const String me = '/auth/me';
  static const String refreshToken = '/auth/refresh';
  static const String forgotPassword = '/auth/forgot-password';
  static const String resetPassword = '/auth/reset-password';

  // Public Tenant Resolution
  static const String publicTenants = '/public/tenants';
  static String tenantByCode(String code) => '/public/tenants/code/$code';
  static String tenantByDomain(String domain) =>
      '/public/tenants/domain/$domain';

  // Academics
  static const String classes = '/classes';
  static const String subjects = '/subjects';
  static const String students = '/students';
  static const String attendance = '/attendance';
  static const String grades = '/grades';
  static const String timetable = '/timetable';
  static const String homework = '/homework';
  static const String exams = '/exams';

  // Finance / Payments
  static const String fees = '/fees';
  static const String payments = '/payments';
  static const String paystackInitialize = '/payments/initialize';
}
