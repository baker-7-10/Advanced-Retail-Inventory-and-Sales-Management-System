import { User, UserRole } from '../../../src/users/entities/user.entity';

export function buildMockUser(overrides: Partial<User> = {}): User {
  const user = new User();
  user.id = 1;
  user.name = 'Test User';
  user.email = 'test@store.com';
  user.password = 'hashed_password';
  user.role = UserRole.EMPLOYEE;
  user.isActive = true;
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  user.hashedRefreshToken = null;
  user.sales = [];
  user.createdAt = new Date();
  user.updatedAt = new Date();
  return Object.assign(user, overrides);
}
