import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { INestApplication, ValidationPipe, UnauthorizedException } from '@nestjs/common';
import * as request from 'supertest';
import { ReportsController } from '../../../src/reports/reports.controller';
import { ReportsService } from '../../../src/reports/reports.service';
import { JwtAuthGuard } from '../../../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../src/common/guards/roles.guard';
import { UserRole } from '../../../src/users/entities/user.entity';

function buildMockService(): jest.Mocked<ReportsService> {
  return {
    getSalesSummary: jest.fn(),
    getTopProducts: jest.fn(),
    getSalesByDay: jest.fn(),
    getSalesByCategory: jest.fn(),
    getStockReport: jest.fn(),
  } as unknown as jest.Mocked<ReportsService>;
}

async function createApp(
  mockService: jest.Mocked<ReportsService>,
  user?: { id: number; email: string; role: UserRole },
  useRealRolesGuard: boolean = false,
): Promise<INestApplication> {
  const providers: any[] = [{ provide: ReportsService, useValue: mockService }];

  if (!useRealRolesGuard) {
    const moduleBuilder = Test.createTestingModule({
      controllers: [ReportsController],
      providers,
    });

    moduleBuilder.overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true });
    moduleBuilder.overrideGuard(RolesGuard).useValue({ canActivate: () => true });

    const module = await moduleBuilder.compile();
    const app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    return app;
  }

  // Real roles guard — for testing authorization
  const moduleBuilder = Test.createTestingModule({
    controllers: [ReportsController],
    providers,
  });

  moduleBuilder.overrideGuard(JwtAuthGuard).useValue({
    canActivate: () => true,
  });

  const module = await moduleBuilder.compile();
  const app = module.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.init();
  return app;
}

describe('Reports (e2e)', () => {
  let app: INestApplication;
  let mockService: jest.Mocked<ReportsService>;

  beforeEach(async () => {
    mockService = buildMockService();
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  // --- Authorization ---

  describe('Authorization', () => {
    it('should return 401 when not authenticated', async () => {
      const moduleBuilder = Test.createTestingModule({
        controllers: [ReportsController],
        providers: [{ provide: ReportsService, useValue: mockService }],
      });

      moduleBuilder.overrideGuard(JwtAuthGuard).useValue({
        canActivate: () => { throw new UnauthorizedException(); },
      });
      moduleBuilder.overrideGuard(RolesGuard).useValue({ canActivate: () => true });

      const module = await moduleBuilder.compile();
      app = module.createNestApplication();
      await app.init();

      await request(app.getHttpServer())
        .get('/reports/summary')
        .expect(401);
    });

    it('should return 403 for forbidden role', async () => {
      const moduleBuilder = Test.createTestingModule({
        controllers: [ReportsController],
        providers: [{ provide: ReportsService, useValue: mockService }],
      });

      moduleBuilder.overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true });
      moduleBuilder.overrideGuard(RolesGuard).useValue({ canActivate: () => false });

      const module = await moduleBuilder.compile();
      app = module.createNestApplication();
      await app.init();

      await request(app.getHttpServer())
        .get('/reports/summary')
        .expect(403);
    });
  });

  // --- Summary ---

  describe('GET /reports/summary', () => {
    it('should return 200 with summary data', async () => {
      app = await createApp(mockService);
      mockService.getSalesSummary.mockResolvedValue({
        totalTransactions: 10,
        totalRevenue: 5000,
        averageSale: 500,
        totalDiscount: 200,
      });

      const res = await request(app.getHttpServer())
        .get('/reports/summary')
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  // --- Daily Sales ---

  describe('GET /reports/sales-by-day', () => {
    it('should return 200 with valid dates', async () => {
      app = await createApp(mockService);
      mockService.getSalesByDay.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/reports/sales-by-day?startDate=2024-01-01&endDate=2024-12-31')
        .expect(200);
    });

    it('should return 400 when dates are missing', async () => {
      app = await createApp(mockService);

      await request(app.getHttpServer())
        .get('/reports/sales-by-day')
        .expect(400);
    });

    it('should return 400 when dates are invalid', async () => {
      app = await createApp(mockService);

      await request(app.getHttpServer())
        .get('/reports/sales-by-day?startDate=not-a-date&endDate=2024-12-31')
        .expect(400);
    });

    it('should succeed when only startDate is provided (endDate defaults to today)', async () => {
      app = await createApp(mockService);

      await request(app.getHttpServer())
        .get('/reports/sales-by-day?startDate=2024-01-01')
        .expect(200);
    });

    it('should return 400 when startDate is after endDate', async () => {
      app = await createApp(mockService);

      await request(app.getHttpServer())
        .get('/reports/sales-by-day?startDate=2024-12-31&endDate=2024-01-01')
        .expect(400);
    });

    it('should return 400 when startDate equals endDate', async () => {
      app = await createApp(mockService);

      await request(app.getHttpServer())
        .get('/reports/sales-by-day?startDate=2024-01-01&endDate=2024-01-01')
        .expect(400);
    });
  });

  // --- Top Products ---

  describe('GET /reports/top-products', () => {
    it('should return 200 with valid limit', async () => {
      app = await createApp(mockService);
      mockService.getTopProducts.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/reports/top-products?limit=5')
        .expect(200);
    });

    it('should return 400 with invalid limit (string)', async () => {
      app = await createApp(mockService);

      await request(app.getHttpServer())
        .get('/reports/top-products?limit=abc')
        .expect(400);
    });

    it('should return 400 with negative limit', async () => {
      app = await createApp(mockService);

      await request(app.getHttpServer())
        .get('/reports/top-products?limit=-5')
        .expect(400);
    });

    it('should return 400 with limit exceeding max (100)', async () => {
      app = await createApp(mockService);

      await request(app.getHttpServer())
        .get('/reports/top-products?limit=200')
        .expect(400);
    });
  });

  // --- Category Sales ---

  describe('GET /reports/sales-by-category', () => {
    it('should return 200 with data', async () => {
      app = await createApp(mockService);
      mockService.getSalesByCategory.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get('/reports/sales-by-category')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // --- Stock Report ---

  describe('GET /reports/stock', () => {
    it('should return 200 with default threshold', async () => {
      app = await createApp(mockService);
      mockService.getStockReport.mockResolvedValue({
        summary: { totalProducts: 100, lowStock: 5, outOfStock: 2 },
        products: [],
      });

      await request(app.getHttpServer())
        .get('/reports/stock')
        .expect(200);
    });

    it('should return 200 with custom threshold', async () => {
      app = await createApp(mockService);
      mockService.getStockReport.mockResolvedValue({
        summary: { totalProducts: 100, lowStock: 5, outOfStock: 2 },
        products: [],
      });

      await request(app.getHttpServer())
        .get('/reports/stock?threshold=20')
        .expect(200);
    });

    it('should return 400 with invalid threshold', async () => {
      app = await createApp(mockService);

      await request(app.getHttpServer())
        .get('/reports/stock?threshold=-1')
        .expect(400);
    });

    it('should return 400 with non-numeric threshold', async () => {
      app = await createApp(mockService);

      await request(app.getHttpServer())
        .get('/reports/stock?threshold=abc')
        .expect(400);
    });
  });
});
