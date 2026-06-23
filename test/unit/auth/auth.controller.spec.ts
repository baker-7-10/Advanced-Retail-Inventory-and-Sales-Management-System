import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthController } from '../../../src/auth/auth.controller';
import { AuthService } from '../../../src/auth/auth.service';
import { LoginDto } from '../../../src/auth/dto/login.dto';
import { RefreshTokenDto } from '../../../src/auth/dto/refresh-token.dto';
import { UserRole } from '../../../src/users/entities/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockRequest = { ip: '127.0.0.1' } as any;

  beforeEach(async () => {
    authService = {
      validateUser: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      getProfile: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('login', () => {
    it('should call validateUser and login on valid credentials', async () => {
      const loginDto: LoginDto = { email: 'test@store.com', password: 'password123' };
      const mockUser = { id: 1, email: 'test@store.com' } as any;
      const mockResponse = {
        accessToken: 'token',
        refreshToken: 'refresh',
        user: { id: 1, email: 'test@store.com', role: UserRole.EMPLOYEE },
      };

      authService.validateUser.mockResolvedValue(mockUser);
      authService.login.mockResolvedValue(mockResponse);

      const result = await controller.login(loginDto, mockRequest);

      expect(authService.validateUser).toHaveBeenCalledWith(
        'test@store.com', 'password123', '127.0.0.1',
      );
      expect(authService.login).toHaveBeenCalledWith(mockUser, '127.0.0.1');
      expect(result).toEqual(mockResponse);
    });

    it('should throw UnauthorizedException when validateUser returns null', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(
        controller.login({ email: 'test@store.com', password: 'wrong' }, mockRequest),
      ).rejects.toThrow(UnauthorizedException);
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('should propagate ForbiddenException for locked accounts', async () => {
      authService.validateUser.mockRejectedValue(
        new ForbiddenException('Account temporarily locked'),
      );

      await expect(
        controller.login({ email: 'locked@store.com', password: 'password123' }, mockRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should have throttle decorator with limit 5 and ttl 60000', () => {
      const limit = Reflect.getMetadata(
        'THROTTLER:LIMITdefault',
        AuthController.prototype.login,
      );
      const ttl = Reflect.getMetadata(
        'THROTTLER:TTLdefault',
        AuthController.prototype.login,
      );

      expect(limit).toBe(5);
      expect(ttl).toBe(60000);
    });
  });

  describe('refresh', () => {
    it('should call authService.refresh with token and IP', async () => {
      const dto: RefreshTokenDto = { refreshToken: 'some.refresh.token' };
      const mockResponse = {
        accessToken: 'new_access',
        refreshToken: 'new_refresh',
        user: { id: 1, email: 'test@store.com', role: UserRole.EMPLOYEE },
      };

      authService.refresh.mockResolvedValue(mockResponse);

      const result = await controller.refresh(dto, mockRequest);

      expect(authService.refresh).toHaveBeenCalledWith('some.refresh.token', '127.0.0.1');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('logout', () => {
    it('should call authService.logout with current user id', async () => {
      const currentUser = { id: 1, email: 'test@store.com', role: UserRole.EMPLOYEE };

      await controller.logout(currentUser);

      expect(authService.logout).toHaveBeenCalledWith(1);
    });
  });
});
