import { Test, TestingModuleBuilder } from '@nestjs/testing';
import {
  INestApplication, ValidationPipe, CanActivate, ExecutionContext,
  UnauthorizedException, ConflictException, NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as request from 'supertest';
import { ProductsController } from '../../../src/products/products.controller';
import { ProductsService } from '../../../src/products/products.service';
import { JwtAuthGuard } from '../../../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../src/common/guards/roles.guard';
import { UserRole } from '../../../src/users/entities/user.entity';
import { buildMockProduct, buildMockInventory } from '../../fixtures';

const mockProduct = buildMockProduct({ id: 1, name: 'Gaming Mouse', price: 49.99, sku: 'SKU-GM-001' });
const mockInventory = buildMockInventory({ productId: 1, quantity: 100 });
const paginatedResult = {
  data: [mockProduct],
  meta: { total: 1, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPrevPage: false },
};
const lowStockResult = [mockInventory];

function buildMockService(): jest.Mocked<ProductsService> {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    updateStock: jest.fn(),
    getLowStockProducts: jest.fn(),
    search: jest.fn(),
  } as unknown as jest.Mocked<ProductsService>;
}

async function createApp(
  mockService: jest.Mocked<ProductsService>,
  user?: { id: number; email: string; role: UserRole },
  useRealRolesGuard: boolean = false,
): Promise<INestApplication> {
  const providers: any[] = [{ provide: ProductsService, useValue: mockService }];
  if (useRealRolesGuard) {
    providers.push(Reflector);
  }

  // Attach user for roles guard to read from request
  const guard: CanActivate = {
    canActivate(ctx: ExecutionContext): boolean {
      if (!user) throw new UnauthorizedException();
      const req = ctx.switchToHttp().getRequest();
      req.user = user;
      return true;
    },
  };

  const builder: TestingModuleBuilder = Test.createTestingModule({
    controllers: [ProductsController],
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

describe('Products (e2e)', () => {
  let app: INestApplication;
  let mockService: jest.Mocked<ProductsService>;

  afterEach(async () => {
    if (app) await app.close();
  });

  describe('Authentication', () => {
    it('unauthenticated request => 401', async () => {
      mockService = buildMockService();
      app = await createApp(mockService);

      const response = await request(app.getHttpServer()).get('/products');
      expect(response.status).toBe(401);
    });

    it('authenticated request => success', async () => {
      mockService = buildMockService();
      mockService.findAll.mockResolvedValue(paginatedResult as any);
      app = await createApp(mockService, { id: 1, email: 'admin@store.com', role: UserRole.ADMIN });

      const response = await request(app.getHttpServer()).get('/products');
      expect(response.status).toBe(200);
    });
  });

  describe('Authorization', () => {
    async function testRole(
      role: UserRole,
      expectedStatus: number,
      method: 'post' | 'patch' | 'delete',
      url: string = '/products',
      body?: any,
    ) {
      mockService = buildMockService();
      if (expectedStatus >= 200 && expectedStatus < 300) {
        if (method === 'post') mockService.create.mockResolvedValue(mockProduct as any);
        if (method === 'patch') mockService.update.mockResolvedValue(mockProduct as any);
        if (method === 'delete') mockService.remove.mockResolvedValue(undefined);
      }
      app = await createApp(mockService, { id: 2, email: 'u@store.com', role }, true);

      const req = request(app.getHttpServer())[method](url).send(body);
      const response = await req;
      expect(response.status).toBe(expectedStatus);
      await app.close();
    }

    it('employee forbidden for POST /products', async () => {
      await testRole(UserRole.EMPLOYEE, 403, 'post', '/products', { name: 'Test', price: 10, stock: 1, categoryId: 1 });
    });

    it('manager allowed for POST /products', async () => {
      await testRole(UserRole.MANAGER, 201, 'post', '/products', { name: 'Test', price: 10, stock: 1, categoryId: 1 });
    });

    it('admin allowed for POST /products', async () => {
      await testRole(UserRole.ADMIN, 201, 'post', '/products', { name: 'Test', price: 10, stock: 1, categoryId: 1 });
    });

    it('employee forbidden for PATCH /products/1', async () => {
      await testRole(UserRole.EMPLOYEE, 403, 'patch', '/products/1', { name: 'Test' });
    });

    it('manager allowed for PATCH /products/1', async () => {
      await testRole(UserRole.MANAGER, 200, 'patch', '/products/1', { name: 'Test' });
    });

    it('employee forbidden for DELETE /products/1', async () => {
      await testRole(UserRole.EMPLOYEE, 403, 'delete', '/products/1');
    });

    it('manager allowed for DELETE /products/1', async () => {
      await testRole(UserRole.MANAGER, 204, 'delete', '/products/1');
    });

    it('employee allowed for GET /products (no role restriction)', async () => {
      mockService = buildMockService();
      mockService.findAll.mockResolvedValue(paginatedResult as any);
      app = await createApp(mockService, { id: 3, email: 'emp@store.com', role: UserRole.EMPLOYEE }, true);

      const response = await request(app.getHttpServer()).get('/products');
      expect(response.status).toBe(200);
    });

    it('employee allowed for GET /products/1 (no role restriction)', async () => {
      mockService = buildMockService();
      mockService.findOne.mockResolvedValue(mockProduct as any);
      app = await createApp(mockService, { id: 3, email: 'emp@store.com', role: UserRole.EMPLOYEE }, true);

      const response = await request(app.getHttpServer()).get('/products/1');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /products', () => {
    it('create product success', async () => {
      mockService = buildMockService();
      mockService.create.mockResolvedValue(mockProduct as any);
      app = await createApp(mockService, { id: 1, email: 'admin@store.com', role: UserRole.ADMIN });

      const response = await request(app.getHttpServer())
        .post('/products')
        .send({ name: 'Gaming Mouse', price: 49.99, stock: 100, categoryId: 1, sku: 'SKU-GM-001' });

      expect(response.status).toBe(201);
      expect(mockService.create).toHaveBeenCalled();
    });

    it('duplicate SKU rejected => 409', async () => {
      mockService = buildMockService();
      mockService.create.mockRejectedValue(
        new ConflictException('Product with SKU "SKU-GM-001" already exists'),
      );
      app = await createApp(mockService, { id: 1, email: 'admin@store.com', role: UserRole.ADMIN });

      const response = await request(app.getHttpServer())
        .post('/products')
        .send({ name: 'Gaming Mouse', price: 49.99, stock: 100, categoryId: 1, sku: 'SKU-GM-001' });

      expect(response.status).toBe(409);
    });

    it('invalid payload rejected => 400', async () => {
      mockService = buildMockService();
      app = await createApp(mockService, { id: 1, email: 'admin@store.com', role: UserRole.ADMIN });

      const response = await request(app.getHttpServer())
        .post('/products')
        .send({ name: 'A', price: -5, stock: -1, categoryId: 0 });

      expect(response.status).toBe(400);
      expect(mockService.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /products', () => {
    it('returns products', async () => {
      mockService = buildMockService();
      mockService.findAll.mockResolvedValue(paginatedResult as any);
      app = await createApp(mockService, { id: 1, email: 'admin@store.com', role: UserRole.ADMIN });

      const response = await request(app.getHttpServer()).get('/products');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
    });

    it('pagination works', async () => {
      mockService = buildMockService();
      mockService.findAll.mockImplementation(async (filterDto: any) => ({
        data: [],
        meta: { total: 50, page: filterDto.page, limit: filterDto.limit, totalPages: 3, hasNextPage: true, hasPrevPage: filterDto.page > 1 },
      } as any));
      app = await createApp(mockService, { id: 1, email: 'admin@store.com', role: UserRole.ADMIN });

      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ page: 2, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.meta.page).toBe(2);
      expect(response.body.meta.limit).toBe(10);
      expect(mockService.findAll).toHaveBeenCalledWith(expect.objectContaining({ page: 2, limit: 10 }));
    });

    it('filtering works', async () => {
      mockService = buildMockService();
      mockService.findAll.mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } } as any);
      app = await createApp(mockService, { id: 1, email: 'admin@store.com', role: UserRole.ADMIN });

      await request(app.getHttpServer())
        .get('/products')
        .query({ categoryId: 1, minPrice: 10, maxPrice: 100, inStock: true });

      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 1, minPrice: 10, maxPrice: 100, inStock: true }),
      );
    });

    it('search works', async () => {
      mockService = buildMockService();
      mockService.findAll.mockResolvedValue({ data: [mockProduct], meta: { total: 1, page: 1, limit: 20 } } as any);
      app = await createApp(mockService, { id: 1, email: 'admin@store.com', role: UserRole.ADMIN });

      await request(app.getHttpServer())
        .get('/products')
        .query({ search: 'mouse' });

      expect(mockService.findAll).toHaveBeenCalledWith(expect.objectContaining({ search: 'mouse' }));
    });

    it('search endpoint works', async () => {
      mockService = buildMockService();
      mockService.search.mockResolvedValue({ data: [mockProduct], meta: { total: 1, page: 1, limit: 20 } } as any);
      app = await createApp(mockService, { id: 1, email: 'admin@store.com', role: UserRole.ADMIN });

      await request(app.getHttpServer())
        .get('/products/search')
        .query({ q: 'mouse' });

      expect(mockService.search).toHaveBeenCalledWith(expect.objectContaining({ q: 'mouse' }));
    });

    it('sorting works', async () => {
      mockService = buildMockService();
      mockService.findAll.mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } } as any);
      app = await createApp(mockService, { id: 1, email: 'admin@store.com', role: UserRole.ADMIN });

      await request(app.getHttpServer())
        .get('/products')
        .query({ sortBy: 'price', sortOrder: 'ASC' });

      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'price', sortOrder: 'ASC' }),
      );
    });
  });

  describe('GET /products/:id', () => {
    it('returns product', async () => {
      mockService = buildMockService();
      mockService.findOne.mockResolvedValue(mockProduct as any);
      app = await createApp(mockService, { id: 1, email: 'admin@store.com', role: UserRole.ADMIN });

      const response = await request(app.getHttpServer()).get('/products/1');
      expect(response.status).toBe(200);
      expect(mockService.findOne).toHaveBeenCalledWith(1);
    });

    it('returns 404', async () => {
      mockService = buildMockService();
      mockService.findOne.mockRejectedValue(
        new NotFoundException('Product with ID 999 not found'),
      );
      app = await createApp(mockService, { id: 1, email: 'admin@store.com', role: UserRole.ADMIN });

      const response = await request(app.getHttpServer()).get('/products/999');
      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /products/:id', () => {
    it('update product success', async () => {
      mockService = buildMockService();
      mockService.update.mockResolvedValue({ ...mockProduct, name: 'Updated' } as any);
      app = await createApp(mockService, { id: 1, email: 'admin@store.com', role: UserRole.ADMIN });

      const response = await request(app.getHttpServer())
        .patch('/products/1')
        .send({ name: 'Updated' });

      expect(response.status).toBe(200);
      expect(mockService.update).toHaveBeenCalledWith(1, { name: 'Updated' }, 1);
    });

    it('404 for missing product', async () => {
      mockService = buildMockService();
      mockService.update.mockRejectedValue(
        new NotFoundException('Product with ID 999 not found'),
      );
      app = await createApp(mockService, { id: 1, email: 'admin@store.com', role: UserRole.ADMIN });

      const response = await request(app.getHttpServer())
        .patch('/products/999')
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
    });

    it('validation failure', async () => {
      mockService = buildMockService();
      app = await createApp(mockService, { id: 1, email: 'admin@store.com', role: UserRole.ADMIN });

      const response = await request(app.getHttpServer())
        .patch('/products/1')
        .send({ price: -10 });

      expect(response.status).toBe(400);
      expect(mockService.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /products/:id', () => {
    it('deactivate product', async () => {
      mockService = buildMockService();
      mockService.remove.mockResolvedValue(undefined);
      app = await createApp(mockService, { id: 1, email: 'admin@store.com', role: UserRole.ADMIN });

      const response = await request(app.getHttpServer()).delete('/products/1');
      expect(response.status).toBe(204);
      expect(mockService.remove).toHaveBeenCalledWith(1, 1);
    });

    it('404 for missing product', async () => {
      mockService = buildMockService();
      mockService.remove.mockRejectedValue(
        new NotFoundException('Product with ID 999 not found'),
      );
      app = await createApp(mockService, { id: 1, email: 'admin@store.com', role: UserRole.ADMIN });

      const response = await request(app.getHttpServer()).delete('/products/999');
      expect(response.status).toBe(404);
    });
  });

  describe('GET /products/low-stock', () => {
    it('default threshold', async () => {
      mockService = buildMockService();
      mockService.getLowStockProducts.mockResolvedValue(lowStockResult as any);
      app = await createApp(mockService, { id: 1, email: 'admin@store.com', role: UserRole.ADMIN });

      const response = await request(app.getHttpServer())
        .get('/products/low-stock')
        .query({ threshold: '10' });

      expect(response.status).toBe(200);
      expect(mockService.getLowStockProducts).toHaveBeenCalledWith(10);
    });

    it('default threshold when omitted', async () => {
      mockService = buildMockService();
      mockService.getLowStockProducts.mockResolvedValue(lowStockResult as any);
      app = await createApp(mockService, { id: 1, email: 'admin@store.com', role: UserRole.ADMIN });

      const response = await request(app.getHttpServer())
        .get('/products/low-stock');

      expect(response.status).toBe(200);
    });

    it('custom threshold', async () => {
      mockService = buildMockService();
      mockService.getLowStockProducts.mockResolvedValue(lowStockResult as any);
      app = await createApp(mockService, { id: 1, email: 'admin@store.com', role: UserRole.ADMIN });

      const response = await request(app.getHttpServer())
        .get('/products/low-stock')
        .query({ threshold: '25' });

      expect(response.status).toBe(200);
      expect(mockService.getLowStockProducts).toHaveBeenCalledWith(25);
    });
  });
});
