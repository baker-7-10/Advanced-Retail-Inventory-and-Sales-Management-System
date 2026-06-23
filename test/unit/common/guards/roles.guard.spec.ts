import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../../../src/common/guards/roles.guard';
import { UserRole } from '../../../../src/users/entities/user.entity';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  function mockContext(role: UserRole, requiredRoles?: UserRole[]) {
    reflector.getAllAndOverride.mockReturnValue(requiredRoles);

    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 1, email: 'test@test.com', role },
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  }

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as unknown as jest.Mocked<Reflector>;
    guard = new RolesGuard(reflector);
  });

  it('should allow access when no roles are required', () => {
    const context = mockContext(UserRole.EMPLOYEE);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should allow ADMIN to bypass role checks', () => {
    const context = mockContext(UserRole.ADMIN, [UserRole.MANAGER]);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should allow access when user has required role', () => {
    const context = mockContext(UserRole.MANAGER, [UserRole.ADMIN, UserRole.MANAGER]);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should deny access when user lacks required role', () => {
    const context = mockContext(UserRole.EMPLOYEE, [UserRole.ADMIN, UserRole.MANAGER]);

    const result = guard.canActivate(context);

    expect(result).toBe(false);
  });
});
