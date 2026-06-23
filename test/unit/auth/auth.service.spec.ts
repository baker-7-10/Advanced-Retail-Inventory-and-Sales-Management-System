import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../../../src/auth/auth.service';
import { UsersRepository } from '../../../src/users/repositories/users.repository';
import { AuditLogService } from '../../../src/common/services/audit-log.service';
import { buildMockUser } from '../../fixtures';

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: jest.Mocked<UsersRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let auditLogService: jest.Mocked<AuditLogService>;

  beforeEach(async () => {
    usersRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      findByIdWithPassword: jest.fn(),
      findOneWithSelect: jest.fn(),
      findAllPaginated: jest.fn(),
      countActiveAdmins: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;

    jwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    auditLogService = {
      log: jest.fn(),
    } as unknown as jest.Mocked<AuditLogService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersRepository, useValue: usersRepository },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateUser', () => {
    it('should return null when user is not found', async () => {
      usersRepository.findByEmailWithPassword.mockResolvedValue(null);

      const result = await service.validateUser('unknown@store.com', 'password');

      expect(result).toBeNull();
      expect(auditLogService.log).toHaveBeenCalledWith('LOGIN_FAILED', {
        email: 'unknown@store.com',
        reason: 'User not found',
      });
    });

    it('should throw ForbiddenException when account is locked', async () => {
      const lockedUser = buildMockUser({
        lockedUntil: new Date(Date.now() + 60 * 60 * 1000),
      });
      usersRepository.findByEmailWithPassword.mockResolvedValue(lockedUser);

      await expect(
        service.validateUser('test@store.com', 'password'),
      ).rejects.toThrow(ForbiddenException);

      expect(auditLogService.log).toHaveBeenCalledWith('ACCOUNT_LOCKED', {
        userId: 1,
        email: 'test@store.com',
      });
    });

    it('should return null when user is inactive', async () => {
      usersRepository.findByEmailWithPassword.mockResolvedValue(buildMockUser({ isActive: false }));

      const result = await service.validateUser('test@store.com', 'password');

      expect(result).toBeNull();
    });

    it('should increment failedLoginAttempts on invalid password', async () => {
      const mockUser = buildMockUser();
      usersRepository.findByEmailWithPassword.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      usersRepository.save.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@store.com', 'wrong_password');

      expect(result).toBeNull();
      expect(usersRepository.save).toHaveBeenCalled();
      expect(auditLogService.log).toHaveBeenCalledWith('LOGIN_FAILED', {
        email: 'test@store.com',
        reason: 'Invalid password',
      });
    });

    it('should lock account after 5 consecutive failures', async () => {
      const nearLockUser = buildMockUser({ failedLoginAttempts: 4 });
      usersRepository.findByEmailWithPassword.mockResolvedValue(nearLockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      usersRepository.save.mockImplementation(async (user) => user);

      await service.validateUser('test@store.com', 'wrong_password');

      expect(usersRepository.save).toHaveBeenCalledTimes(1);
      const savedUser = usersRepository.save.mock.calls[0][0];
      expect(savedUser.failedLoginAttempts).toBe(5);
      expect(savedUser.lockedUntil).toBeInstanceOf(Date);
      expect(savedUser.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
      expect(auditLogService.log).toHaveBeenCalledWith('ACCOUNT_LOCKED', {
        userId: 1,
        email: 'test@store.com',
      });
    });

    it('should return user on successful validation without modifying state', async () => {
      const mockUser = buildMockUser();
      usersRepository.findByEmailWithPassword.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.validateUser('test@store.com', 'correct_password');

      expect(result).toEqual(mockUser);
      expect(usersRepository.save).not.toHaveBeenCalled();
    });

    it('should include IP in audit log when provided', async () => {
      const mockUser = buildMockUser();
      usersRepository.findByEmailWithPassword.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      usersRepository.save.mockResolvedValue(mockUser);

      await service.validateUser('test@store.com', 'wrong_password', '192.168.1.1');

      expect(auditLogService.log).toHaveBeenCalledWith('LOGIN_FAILED', {
        email: 'test@store.com',
        ip: '192.168.1.1',
        reason: 'Invalid password',
      });
    });
  });

  describe('login', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'REFRESH_TOKEN_SECRET') return 'test-refresh-secret';
        if (key === 'REFRESH_TOKEN_EXPIRES_IN') return '7d';
        return null;
      });
      jwtService.sign.mockReturnValue('mock.jwt.token');
      usersRepository.save.mockImplementation(async (user) => user);
    });

    it('should return AuthResponseDto with access and refresh tokens', async () => {
      const mockUser = buildMockUser();
      const result = await service.login(mockUser);

      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.refreshToken).toBe('mock.jwt.token');
      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });

    it('should reset failedLoginAttempts and lockedUntil', async () => {
      const userWithFailures = buildMockUser({
        failedLoginAttempts: 3,
        lockedUntil: new Date(Date.now() + 60 * 60 * 1000),
      });

      await service.login(userWithFailures);

      const savedUser = usersRepository.save.mock.calls[0][0];
      expect(savedUser.failedLoginAttempts).toBe(0);
      expect(savedUser.lockedUntil).toBeNull();
    });

    it('should store hashed refresh token (not raw)', async () => {
      await service.login(buildMockUser());

      const savedUser = usersRepository.save.mock.calls[0][0];
      expect(savedUser.hashedRefreshToken).toBeTruthy();
      expect(savedUser.hashedRefreshToken).not.toBe('mock.jwt.token');
    });

    it('should log LOGIN_SUCCESS with metadata', async () => {
      await service.login(buildMockUser(), '10.0.0.1');

      expect(auditLogService.log).toHaveBeenCalledWith('LOGIN_SUCCESS', {
        userId: 1,
        email: 'test@store.com',
        ip: '10.0.0.1',
      });
    });
  });

  describe('refresh', () => {
    const validRefreshToken = 'valid.refresh.token';

    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'REFRESH_TOKEN_SECRET') return 'test-refresh-secret';
        if (key === 'REFRESH_TOKEN_EXPIRES_IN') return '7d';
        return null;
      });
      jwtService.sign.mockReturnValue('new.mock.jwt.token');
      jwtService.verify.mockReturnValue({ sub: 1, email: 'test@store.com' });
      usersRepository.save.mockImplementation(async (user) => user);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('Invalid'); });

      await expect(service.refresh('invalid.token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      usersRepository.findByIdWithPassword.mockResolvedValue(null);

      await expect(service.refresh(validRefreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when no stored refresh token', async () => {
      usersRepository.findByIdWithPassword.mockResolvedValue(buildMockUser({ hashedRefreshToken: null }));

      await expect(service.refresh(validRefreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when stored hash does not match', async () => {
      usersRepository.findByIdWithPassword.mockResolvedValue(buildMockUser({ hashedRefreshToken: 'stored_hash' }));
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.refresh(validRefreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should return new tokens on successful refresh', async () => {
      usersRepository.findByIdWithPassword.mockResolvedValue(buildMockUser({ hashedRefreshToken: 'stored_hash' }));
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.refresh(validRefreshToken);

      expect(result.accessToken).toBe('new.mock.jwt.token');
      expect(result.refreshToken).toBe('new.mock.jwt.token');
      expect(result.user).toEqual({
        id: 1,
        email: 'test@store.com',
        role: expect.any(String),
      });
    });

    it('should rotate refresh token (store new hash, not the old one)', async () => {
      usersRepository.findByIdWithPassword.mockResolvedValue(buildMockUser({ hashedRefreshToken: 'old_stored_hash' }));
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      await service.refresh(validRefreshToken);

      const savedUser = usersRepository.save.mock.calls[0][0];
      expect(savedUser.hashedRefreshToken).toBeTruthy();
      expect(savedUser.hashedRefreshToken).not.toBe('old_stored_hash');
    });

    it('should log TOKEN_REFRESHED', async () => {
      usersRepository.findByIdWithPassword.mockResolvedValue(buildMockUser({ hashedRefreshToken: 'stored_hash' }));
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      await service.refresh(validRefreshToken);

      expect(auditLogService.log).toHaveBeenCalledWith('TOKEN_REFRESHED', {
        userId: 1,
        email: 'test@store.com',
      });
    });

    it('should make old refresh token unusable after rotation', async () => {
      const originalToken = 'original.refresh.token';
      const storedHash = await bcrypt.hash(originalToken, 10);
      usersRepository.findByIdWithPassword.mockResolvedValue(buildMockUser({ hashedRefreshToken: storedHash }));
      jwtService.verify.mockReturnValue({ sub: 1, email: 'test@store.com' });
      jwtService.sign.mockReturnValue('new.token');
      usersRepository.save.mockImplementation(async (user) => user);

      await service.refresh(originalToken);

      const savedUser = usersRepository.save.mock.calls[0][0];
      const isOldHashValid = await bcrypt.compare(originalToken, savedUser.hashedRefreshToken!);
      expect(isOldHashValid).toBe(false);
    });
  });

  describe('logout', () => {
    it('should clear hashedRefreshToken', async () => {
      const userWithToken = buildMockUser({ hashedRefreshToken: 'some_hash' });
      usersRepository.findByIdWithPassword.mockResolvedValue(userWithToken);
      usersRepository.save.mockImplementation(async (user) => user);

      await service.logout(1);

      const savedUser = usersRepository.save.mock.calls[0][0];
      expect(savedUser.hashedRefreshToken).toBeNull();
    });

    it('should do nothing when user is not found', async () => {
      usersRepository.findByIdWithPassword.mockResolvedValue(null);

      await service.logout(999);

      expect(usersRepository.save).not.toHaveBeenCalled();
    });

    it('should make refresh token unusable after logout', async () => {
      const refreshTokenValue = 'some.refresh.token';
      const storedHash = await bcrypt.hash(refreshTokenValue, 10);
      const userWithToken = buildMockUser({ hashedRefreshToken: storedHash });
      usersRepository.findByIdWithPassword.mockResolvedValue(userWithToken);
      usersRepository.save.mockImplementation(async (user) => user);

      await service.logout(1);

      const savedUser = usersRepository.save.mock.calls[0][0];
      const isStillValid = await bcrypt.compare(
        refreshTokenValue,
        savedUser.hashedRefreshToken ?? '',
      );
      expect(isStillValid).toBe(false);
    });
  });
});
