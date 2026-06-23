import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import * as request from 'supertest';
import { AuthController } from '../../../src/auth/auth.controller';
import { AuthService } from '../../../src/auth/auth.service';

describe('POST /auth/login (e2e)', () => {
  let app: INestApplication;
  let authService: jest.Mocked<AuthService>;

  const mockUser = { id: 1, email: 'test@store.com', role: 'employee' };

  beforeAll(async () => {
    authService = {
      validateUser: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      getProfile: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }]),
      ],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        Reflector,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('throttling', () => {
    it('should allow 5 requests then return 429 on the 6th', async () => {
      authService.validateUser.mockResolvedValue(mockUser as any);
      authService.login.mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'refresh',
        user: mockUser as any,
      });

      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'test@store.com', password: 'password123' });
      }

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@store.com', password: 'password123' });

      expect(response.status).toBe(429);
    });
  });

  describe('refresh endpoint', () => {
    it('should return 200 with tokens for valid refresh token', async () => {
      authService.refresh.mockResolvedValue({
        accessToken: 'new_access',
        refreshToken: 'new_refresh',
        user: mockUser as any,
      });

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'valid.refresh.token' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
    });
  });
});
