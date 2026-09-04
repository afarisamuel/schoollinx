import 'package:flutter_test/flutter_test.dart';
import 'package:schoollinx_core/schoollinx_core.dart';

void main() {
  test('UserEntity parses role correctly', () {
    const teacher = UserEntity(
      id: '1',
      email: 'teacher@school.com',
      firstName: 'Jane',
      lastName: 'Doe',
      role: UserRole.teacher,
    );

    expect(teacher.fullName, 'Jane Doe');
    expect(teacher.initials, 'JD');
    expect(teacher.role.displayName, 'Teacher');
  });

  test('TenantEntity holds institution details', () {
    const tenant = TenantEntity(
      id: 't-123',
      name: 'Springfield High',
      code: 'SPRG01',
    );

    expect(tenant.name, 'Springfield High');
    expect(tenant.code, 'SPRG01');
  });
}
