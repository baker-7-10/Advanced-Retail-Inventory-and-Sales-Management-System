import { ROLES_KEY } from '../../../../src/common/decorators/roles.decorator';
import { UserRole } from '../../../../src/users/entities/user.entity';

describe('Roles Decorator', () => {
  it('should set metadata with role values', () => {
    const { Roles } = require('../../../../src/common/decorators/roles.decorator');
    const roles = [UserRole.ADMIN, UserRole.MANAGER];
    const decorator = Roles(...roles);

    const target = () => {};
    decorator(target);

    const metadata = Reflect.getOwnMetadata(ROLES_KEY, target);
    expect(metadata).toEqual(roles);
  });
});
