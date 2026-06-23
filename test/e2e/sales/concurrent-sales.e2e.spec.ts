import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SalesController } from '../../../src/sales/sales.controller';
import { SalesService } from '../../../src/sales/sales.service';
import { SalesRepository } from '../../../src/sales/repositories/sales.repository';
import { SaleItemsRepository } from '../../../src/sales/repositories/sale-items.repository';
import { ProductsRepository } from '../../../src/products/repositories/products.repository';
import { InventoryService } from '../../../src/inventory/inventory.service';
import { InventoryRepository } from '../../../src/inventory/inventory.repository';
import { InventoryGateway } from '../../../src/inventory/inventory.gateway';
import { AuditLogService } from '../../../src/common/services/audit-log.service';
import { JwtAuthGuard } from '../../../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../src/common/guards/roles.guard';
import { Sale } from '../../../src/sales/entities/sale.entity';
import { SaleItem } from '../../../src/sales/entities/sale-item.entity';
import { SaleStatus } from '../../../src/sales/entities/sale.entity';
import { Product } from '../../../src/products/entities/product.entity';
import { Inventory } from '../../../src/inventory/inventory.entity';
import { Category } from '../../../src/categories/entities/category.entity';

function mockAuthGuard(): CanActivate {
  return {
    canActivate: (ctx: ExecutionContext) => {
      const req = ctx.switchToHttp().getRequest();
      req.user = { id: 42, email: 'concurrent@store.com', role: 'ADMIN' as const };
      return true;
    },
  };
}

describe('Concurrent Sales (e2e) — Pessimistic Locking Overselling Prevention', () => {
  let app: INestApplication;

  let inventoryQuantity = 1;
  let saleCount = 0;

  async function createApp(): Promise<INestApplication> {
    inventoryQuantity = 1;
    saleCount = 0;

    const module = await Test.createTestingModule({
      controllers: [SalesController],
      providers: [
        SalesService, SalesRepository, SaleItemsRepository,
        ProductsRepository, InventoryService, InventoryRepository,
        { provide: AuditLogService, useValue: { log: jest.fn() } },
        { provide: InventoryGateway, useValue: { emitStockUpdate: jest.fn() } },
        { provide: DataSource, useValue: { transaction: async <T>(cb: (m: EntityManager) => Promise<T>): Promise<T> => cb({} as EntityManager) } },
        { provide: getRepositoryToken(Product), useClass: Repository },
        { provide: getRepositoryToken(Sale), useClass: Repository },
        { provide: getRepositoryToken(SaleItem), useClass: Repository },
        { provide: getRepositoryToken(Inventory), useClass: Repository },
        { provide: getRepositoryToken(Category), useClass: Repository },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockAuthGuard())
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true } as CanActivate)
      .compile();

    const app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    const inventoryRepository = module.get(InventoryRepository);
    jest.spyOn(inventoryRepository, 'findByProductId').mockImplementation(async () => {
      const i = new Inventory(); i.id = 1; i.productId = 1; i.quantity = inventoryQuantity; i.minimumStock = 10; return i;
    });
    jest.spyOn(inventoryRepository, 'findByProductIdWithLock').mockImplementation(async () => {
      const i = new Inventory(); i.id = 1; i.productId = 1; i.quantity = inventoryQuantity; i.minimumStock = 10; return i;
    });
    jest.spyOn(inventoryRepository, 'decrement').mockImplementation(async () => { inventoryQuantity = 0; });

    const salesRepository = module.get(SalesRepository);
    jest.spyOn(salesRepository, 'create').mockImplementation(async () => {
      saleCount++;
      const s = new Sale(); s.id = saleCount; s.invoiceNumber = `INV-CONC-${saleCount}`; s.subtotal = 100; s.total = 100; s.status = SaleStatus.COMPLETED; s.createdAt = new Date(); return s;
    });
    jest.spyOn(salesRepository, 'save').mockImplementation(async (s: Sale) => s);

    const productsRepository = module.get(ProductsRepository);
    jest.spyOn(productsRepository, 'findByIds').mockImplementation(async () => {
      const p = new Product(); p.id = 1; p.name = 'Concurrent Test Product'; p.sku = 'SKU-CONC-001'; p.price = 100; p.isActive = true; p.stock = 1;
      const i = new Inventory(); i.id = 1; i.productId = 1; i.quantity = inventoryQuantity; i.minimumStock = 10; p.inventory = i;
      return [p];
    });

    return app;
  }

  afterEach(async () => {
    if (app) await app.close();
  });

  it('exactly one of two concurrent sale requests succeeds', async () => {
    app = await createApp();
    const server = app.getHttpServer();

    const [result1, result2] = await Promise.allSettled([
      request(server).post('/sales').send({ items: [{ productId: 1, quantity: 1 }] }),
      request(server).post('/sales').send({ items: [{ productId: 1, quantity: 1 }] }),
    ]);

    const fulfilled = [result1, result2].filter(
      (r): r is PromiseFulfilledResult<request.Response> => r.status === 'fulfilled',
    );

    const successful = fulfilled.filter((r) => r.value.status === 201);
    const failed = fulfilled.filter((r) => r.value.status >= 400);

    expect(successful.length).toBe(1);
    expect(failed.length).toBe(1);
    expect(inventoryQuantity).toBe(0);
    expect(saleCount).toBe(1);
  });
});
