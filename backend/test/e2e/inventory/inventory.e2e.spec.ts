import { Test, TestingModuleBuilder } from '@nestjs/testing';
import {
  INestApplication, ValidationPipe, CanActivate, ExecutionContext,
  UnauthorizedException, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as request from 'supertest';
import { InventoryController } from '../../../src/inventory/inventory.controller';
import { InventoryService } from '../../../src/inventory/inventory.service';
import { JwtAuthGuard } from '../../../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../src/common/guards/roles.guard';
import { UserRole } from '../../../src/users/entities/user.entity';
import { buildMockInventory } from '../../fixtures';

const mockInventory = buildMockInventory({ id: 1, productId: 1, quantity: 50, minimumStock: 10 });
const statsResult = { totalProducts: 100, lowStockProducts: 5, outOfStockProducts: 2 };

function buildMockService(): jest.Mocked<InventoryService> {
  return {
    findByProductId: jest.fn(),
    findOrCreate: jest.fn(),
    decreaseStock: jest.fn(),
    updateQuantity: jest.fn(),
    updateMinimumStock: jest.fn(),
    countLowStock: jest.fn(),
    countOutOfStock: jest.fn(),
    countTotalProducts: jest.fn(),
    getStats: jest.fn(),
    getLowStockProducts: jest.fn(),
    getAllStock: jest.fn(),
  } as unknown as jest.Mocked<InventoryService>;
}

async function createApp(
  mockService: jest.Mocked<InventoryService>,
  user?: { id: number; email: string; role: UserRole },
  useRealRolesGuard: boolean = false,
): Promise<INestApplication> {
  const providers: any[] = [{ provide: InventoryService, useValue: mockService }];
  if (useRealRolesGuard) {
    providers.push(Reflector);
  }

  const guard: CanActivate = {
    canActivate(ctx: ExecutionContext): boolean {
      if (!user) throw new UnauthorizedException();
      const req = ctx.switchToHttp().getRequest();
      req.user = user;
      return true;
    },
  };

  const builder: TestingModuleBuilder = Test.createTestingModule({
    controllers: [InventoryController],
    providers,
  })
    .overrideGuard(JwtAuthGuard)
    .useValue(guard);

  builder.overrideGuard(RolesGuard).useValue(
    useRealRolesGuard
      ? new RolesGuard(new Reflector())
      : { canActivate: () => true },
  );

  const moduleFixture = await builder.compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  return app;
}

describe('Inventory (e2e)', () => {
  let app: INestApplication;
  let mockService: jest.Mocked<InventoryService>;

  afterEach(async () => {
    if (app) await app.close();
  });

  describe('Authentication', () => {
    it('unauthenticated => 401', async () => {
      mockService = buildMockService();
      app = await createApp(mockService);

      const response = await request(app.getHttpServer()).get('/inventory/low-stock');
      expect(response.status).toBe(401);
    });

    it('authenticated => success', async () => {
      mockService = buildMockService();
      mockService.getLowStockProducts.mockResolvedValue([]);
      app = await createApp(mockService, { id: 1, email: 'admin@store.com', role: UserRole.ADMIN });

      const response = await request(app.getHttpServer()).get('/inventory/low-stock');
      expect(response.status).toBe(200);
    });
  });

  describe('Authorization', () => {
    async function testRole(
      role: UserRole,
      expectedStatus: number,
      method: 'get' | 'patch',
      url: string,
      body?: any,
    ) {
      mockService = buildMockService();
      if (expectedStatus >= 200 && expectedStatus < 300) {
        if (method === 'get') mockService.getLowStockProducts.mockResolvedValue([]);
        if (method === 'patch') mockService.updateMinimumStock.mockResolvedValue(mockInventory as any);
      }
      app = await createApp(mockService, { id: 2, email: 'u@store.com', role }, true);

      const req = request(app.getHttpServer())[method](url).send(body);
      const response = await req;
      expect(response.status).toBe(expectedStatus);
      await app.close();
    }

    it('employee forbidden for GET /inventory/low-stock', async () => {
      await testRole(UserRole.EMPLOYEE, 403, 'get', '/inventory/low-stock');
    });

    it('manager allowed for GET /inventory/low-stock', async () => {
      await testRole(UserRole.MANAGER, 200, 'get', '/inventory/low-stock');
    });

    it('admin allowed for GET /inventory/low-stock', async () => {
      await testRole(UserRole.ADMIN, 200, 'get', '/inventory/low-stock');
    });

    it('employee forbidden for GET /inventory/stats', async () => {
      mockService = buildMockService();
      mockService.getStats.mockResolvedValue(statsResult as any);
      app = await createApp(mockService, { id: 2, email: 'u@store.com', role: UserRole.EMPLOYEE }, true);

      const response = await request(app.getHttpServer()).get('/inventory/stats');
      expect(response.status).toBe(403);
    });

    it('admin allowed for GET /inventory/stats', async () => {
      mockService = buildMockService();
      mockService.getStats.mockResolvedValue(statsResult as any);
      app = await createApp(mockService, { id: 1, email: 'u@store.com', role: UserRole.ADMIN }, true);

      const response = await request(app.getHttpServer()).get('/inventory/stats');
      expect(response.status).toBe(200);
    });

    it('employee forbidden for PATCH /inventory/1/minimum-stock', async () => {
      await testRole(UserRole.EMPLOYEE, 403, 'patch', '/inventory/1/minimum-stock', { minimumStock: 20 });
    });

    it('manager allowed for PATCH /inventory/1/minimum-stock', async () => {
      await testRole(UserRole.MANAGER, 200, 'patch', '/inventory/1/minimum-stock', { minimumStock: 20 });
    });

    it('admin allowed for PATCH /inventory/1/minimum-stock', async () => {
      await testRole(UserRole.ADMIN, 200, 'patch', '/inventory/1/minimum-stock', { minimumStock: 20 });
    });
  });

  describe('GET /inventory/low-stock', () => {
    it('returns low stock products', async () => {
      mockService = buildMockService();
      mockService.getLowStockProducts.mockResolvedValue([mockInventory] as any);
      app = await createApp(mockService, { id: 1, email: 'admin@store.com', role: UserRole.ADMIN });

      const response = await request(app.getHttpServer())
        .get('/inventory/low-stock')
        .query({ threshold: '10' });

      expect(response.status).toBe(200);
      expect(mockService.getLowStockProducts).toHaveBeenCalledWith(10, expect.any(Number), expect.any(Number));
    });

    it('uses default threshold when omitted', async () => {
      mockService = buildMockService();
      mockService.getLowStockProducts.mockResolvedValue([]);
      app = await createApp(mockService, { id: 1, email: 'admin@store.com', role: UserRole.ADMIN });

      const response = await request(app.getHttpServer())
        .get('/inventory/low-stock');

      expect(response.status).toBe(200);
      expect(mockService.getLowStockProducts).toHaveBeenCalledWith(10, expect.any(Number), expect.any(Number));
    });

    it('rejects invalid threshold', async () => {
      mockService = buildMockService();
      app = await createApp(mockService, { id: 1, email: 'admin@store.com', role: UserRole.ADMIN });

      const response = await request(app.getHttpServer())
        .get('/inventory/low-stock')
        .query({ threshold: '0' });

      expect(response.status).toBe(400);
      expect(mockService.getLowStockProducts).not.toHaveBeenCalled();
    });
  });

  describe('GET /inventory/stats', () => {
    it('returns inventory statistics', async () => {
      mockService = buildMockService();
      mockService.getStats.mockResolvedValue(statsResult as any);
      app = await createApp(mockService, { id: 1, email: 'admin@store.com', role: UserRole.ADMIN });

      const response = await request(app.getHttpServer()).get('/inventory/stats');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(statsResult);
      expect(mockService.getStats).toHaveBeenCalled();
    });
  });

  describe('PATCH /inventory/:productId/minimum-stock', () => {
    it('updates minimum stock', async () => {
      mockService = buildMockService();
      mockService.updateMinimumStock.mockResolvedValue({ ...mockInventory, minimumStock: 20 } as any);
      app = await createApp(mockService, { id: 1, email: 'admin@store.com', role: UserRole.ADMIN });

      const response = await request(app.getHttpServer())
        .patch('/inventory/1/minimum-stock')
        .send({ minimumStock: 20 });

      expect(response.status).toBe(200);
      expect(mockService.updateMinimumStock).toHaveBeenCalledWith(1, 20, 1);
    });

    it('returns 404 for missing product', async () => {
      mockService = buildMockService();
      mockService.updateMinimumStock.mockRejectedValue(
        new NotFoundException('Inventory not found for product 999'),
      );
      app = await createApp(mockService, { id: 1, email: 'admin@store.com', role: UserRole.ADMIN });

      const response = await request(app.getHttpServer())
        .patch('/inventory/999/minimum-stock')
        .send({ minimumStock: 20 });

      expect(response.status).toBe(404);
    });

    it('rejects invalid minimumStock', async () => {
      mockService = buildMockService();
      app = await createApp(mockService, { id: 1, email: 'admin@store.com', role: UserRole.ADMIN });

      const response = await request(app.getHttpServer())
        .patch('/inventory/1/minimum-stock')
        .send({ minimumStock: -1 });

      expect(response.status).toBe(400);
      expect(mockService.updateMinimumStock).not.toHaveBeenCalled();
    });
  });
});
