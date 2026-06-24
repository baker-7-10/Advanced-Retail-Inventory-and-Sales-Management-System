import { validate } from 'class-validator';
import { CreateUserDto } from '../../../src/users/dto/create-user.dto';

describe('CreateUserDto', () => {
  function createValidDto(): CreateUserDto {
    const dto = new CreateUserDto();
    dto.name = 'John Doe';
    dto.email = 'john@store.com';
    dto.password = 'Password1';
    dto.role = undefined;
    return dto;
  }

  describe('password validation', () => {
    it('should accept a valid password', async () => {
      const dto = createValidDto();
      const errors = await validate(dto);
      const passwordErrors = errors.filter((e) => e.property === 'password');
      expect(passwordErrors).toHaveLength(0);
    });

    it('should reject password shorter than 8 characters', async () => {
      const dto = createValidDto();
      dto.password = 'Pass1';
      const errors = await validate(dto);
      const passwordErrors = errors.filter((e) => e.property === 'password');
      expect(passwordErrors.length).toBeGreaterThan(0);
    });

    it('should reject password without uppercase letter', async () => {
      const dto = createValidDto();
      dto.password = 'password1';
      const errors = await validate(dto);
      const passwordErrors = errors.filter((e) => e.property === 'password');
      expect(passwordErrors.length).toBeGreaterThan(0);
    });

    it('should reject password without lowercase letter', async () => {
      const dto = createValidDto();
      dto.password = 'PASSWORD1';
      const errors = await validate(dto);
      const passwordErrors = errors.filter((e) => e.property === 'password');
      expect(passwordErrors.length).toBeGreaterThan(0);
    });

    it('should reject password without number', async () => {
      const dto = createValidDto();
      dto.password = 'Password';
      const errors = await validate(dto);
      const passwordErrors = errors.filter((e) => e.property === 'password');
      expect(passwordErrors.length).toBeGreaterThan(0);
    });

    it('should accept password meeting all requirements', async () => {
      const dto = createValidDto();
      dto.password = 'Str0ng!Pass';
      const errors = await validate(dto);
      const passwordErrors = errors.filter((e) => e.property === 'password');
      expect(passwordErrors).toHaveLength(0);
    });
  });

});
