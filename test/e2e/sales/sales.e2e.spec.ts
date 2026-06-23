import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { Reflector } from '@nestjs/core';
import { SalesController } from '../../../src/sales/sales.controller';
import { SalesService } from '../../../src/sales/sales.service';
import { SalesRepository } from '../../../src/sales/repositories/sales.repository';
import { SaleItemsRepository } from '../../../src/sales/repositories/sale-items.repository';
import { ProductsRepository } from '../../../src/products/repositories/products.repository';
import { InventoryService } from '../../../src/inventory/inventory.service';
import { InventoryGateway } from '../../../src/inventory/inventory.gateway';
import { JwtAuthGuard } from '../../../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../src/common/guards/roles.guard';
import { NotFoundException } from '@nestjs/common';
import { Sale, SaleStatus } from '../../../src/sales/entities/sale.entity';

describe('Sales (e2e)', () => {
  let app: INestApplication;
  let salesService: jest.Mocked<SalesService>;

  const mockSale = {
    id: 1,
    invoiceNumber: 'INV-2026-TEST',
    subtotal: 400,
    discountPercent: 10,
    discountAmount: 40,
    total: 360,
    notes: null,
    status: SaleStatus.COMPLETED,
    userId: 1,
    items: [],
    createdAt: new Date(),
  } as Sale;

  beforeAll(async () => {
    salesService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      updateStatus: jest.fn(),
      getInvoice: jest.fn(),
    } as unknown as jest.Mocked<SalesService>;

    const moduleBuilder = Test.createTestingModule({
      controllers: [SalesController],
      providers: [
        { provide: SalesService, useValue: salesService },
      ],
    });

    // Override guards to allow all access and set req.user for @CurrentUser()
    moduleBuilder.overrideGuard(JwtAuthGuard).useValue({
      canActivate: (ctx: any) => {
        const req = ctx.switchToHttp().getRequest();
        req.user = { id: 1, email: 'admin@store.com', role: 'ADMIN' };
        return true;
      },
    });
    moduleBuilder.overrideGuard(RolesGuard).useValue({ canActivate: () => true });

    const module = await moduleBuilder.compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /sales', () => {
    it('should return 200 OK with paginated response', async () => {
      salesService.findAll.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      const res = await request(app.getHttpServer())
        .get('/sales')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta).toHaveProperty('total');
      expect(res.body.meta).toHaveProperty('page');
      expect(res.body.meta).toHaveProperty('limit');
      expect(res.body.meta).toHaveProperty('totalPages');
    });

    it('should accept query params', async () => {
      salesService.findAll.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      const res = await request(app.getHttpServer())
        .get('/sales?page=1&limit=10&startDate=2024-01-01&endDate=2024-12-31')
        .expect(200);

      expect(res.body.meta.limit).toBe(10);
    });
  });

  describe('GET /sales/:id', () => {
    it('should return 200 for existing sale', async () => {
      salesService.findOne.mockResolvedValue(mockSale);

      await request(app.getHttpServer())
        .get('/sales/1')
        .expect(200);
    });

    it('should return 404 for non-existent sale', async () => {
      salesService.findOne.mockImplementation(() => {
        throw new NotFoundException('Sale #99999 not found');
      });

      await request(app.getHttpServer())
        .get('/sales/99999')
        .expect(404);
    });
  });

  describe('GET /sales/:id/invoice', () => {
    it('should return 200 for existing sale', async () => {
      salesService.getInvoice.mockResolvedValue({
        invoiceNumber: 'INV-2026-TEST',
        date: new Date(),
        cashier: { name: 'John Doe', email: 'john@store.com' },
        items: [],
        subtotal: 400,
        discountPercent: 10,
        discountAmount: 40,
        total: 360,
        notes: null,
      });

      await request(app.getHttpServer())
        .get('/sales/1/invoice')
        .expect(200);
    });
  });

  describe('PATCH /sales/:id/status', () => {
    it('should return 200 for valid status update', async () => {
      salesService.updateStatus.mockResolvedValue(mockSale);

      await request(app.getHttpServer())
        .patch('/sales/1/status')
        .send({ status: SaleStatus.COMPLETED })
        .expect(200);
    });
  });

});
