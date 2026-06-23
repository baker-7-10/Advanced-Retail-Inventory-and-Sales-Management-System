import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { SalesService } from '../../../src/sales/sales.service';
import { SalesRepository } from '../../../src/sales/repositories/sales.repository';
import { SaleItemsRepository } from '../../../src/sales/repositories/sale-items.repository';
import { ProductsRepository } from '../../../src/products/repositories/products.repository';
import { InventoryService } from '../../../src/inventory/inventory.service';
import { InventoryGateway } from '../../../src/inventory/inventory.gateway';
import { AuditLogService } from '../../../src/common/services/audit-log.service';
import { Sale, SaleStatus } from '../../../src/sales/entities/sale.entity';
import { Product } from '../../../src/products/entities/product.entity';
import { SalesQueryDto } from '../../../src/sales/dto/sales-query.dto';

describe('SalesService', () => {
  let service: SalesService;
  let salesRepository: jest.Mocked<SalesRepository>;
  let saleItemsRepository: jest.Mocked<SaleItemsRepository>;
  let productsRepository: jest.Mocked<ProductsRepository>;
  let inventoryService: jest.Mocked<InventoryService>;
  let dataSource: jest.Mocked<DataSource>;
  let inventoryGateway: jest.Mocked<InventoryGateway>;

  const mockManager = {} as EntityManager;

  const mockInventory = {
    id: 1,
    productId: 1,
    quantity: 10,
    minimumStock: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSale = {
    id: 1,
    invoiceNumber: 'INV-2026-A1B2C3',
    subtotal: 300,
    discountPercent: 10,
    discountAmount: 30,
    total: 270,
    notes: null,
    status: SaleStatus.COMPLETED,
    userId: 1,
    items: [],
    createdAt: new Date(),
  } as Sale;

  const mockProducts = [
    {
      id: 1,
      name: 'Product A',
      price: 100,
      stock: 10,
      isActive: true,
      sku: 'A001',
      description: 'Description A',
      categoryId: 1,
      category: null,
      saleItems: [],
      inventory: { ...mockInventory, productId: 1, quantity: 10 },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      name: 'Product B',
      price: 200,
      stock: 5,
      isActive: true,
      sku: 'B001',
      description: 'Description B',
      categoryId: 1,
      category: null,
      saleItems: [],
      inventory: { ...mockInventory, productId: 2, quantity: 5 },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ] as unknown as Product[];

  const createSaleDto = {
    items: [
      { productId: 1, quantity: 2 },
      { productId: 2, quantity: 1 },
    ],
    discountPercent: 10,
  };

  beforeEach(async () => {
    salesRepository = {
      create: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      findAllPaginated: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<SalesRepository>;

    saleItemsRepository = {} as unknown as jest.Mocked<SaleItemsRepository>;

    productsRepository = {
      findByIds: jest.fn(),
      findById: jest.fn(),
      findByIdOrFail: jest.fn(),
      findBySku: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
      findAllPaginated: jest.fn(),
      countActive: jest.fn(),
    } as unknown as jest.Mocked<ProductsRepository>;

    inventoryService = {
      decreaseStock: jest.fn(),
      findByProductId: jest.fn(),
      findOrCreate: jest.fn(),
      updateQuantity: jest.fn(),
      countLowStock: jest.fn(),
      countOutOfStock: jest.fn(),
      getLowStockProducts: jest.fn(),
      getAllStock: jest.fn(),
    } as unknown as jest.Mocked<InventoryService>;

    dataSource = {
      transaction: jest.fn().mockImplementation(async <T>(cb: (m: EntityManager) => Promise<T>): Promise<T> => {
        return cb(mockManager);
      }),
    } as unknown as jest.Mocked<DataSource>;

    inventoryGateway = {
      emitStockUpdate: jest.fn(),
      emitLowStock: jest.fn(),
      emitOutOfStock: jest.fn(),
      emitNotification: jest.fn(),
    } as unknown as jest.Mocked<InventoryGateway>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: SalesRepository, useValue: salesRepository },
        { provide: SaleItemsRepository, useValue: saleItemsRepository },
        { provide: ProductsRepository, useValue: productsRepository },
        { provide: InventoryService, useValue: inventoryService },
        { provide: DataSource, useValue: dataSource },
        { provide: InventoryGateway, useValue: inventoryGateway },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
  });

  describe('create', () => {
    it('should create a sale and emit stock updates on success', async () => {
      productsRepository.findByIds
        .mockResolvedValueOnce(mockProducts)
        .mockResolvedValueOnce(mockProducts);

      salesRepository.create.mockResolvedValue(mockSale);
      inventoryService.decreaseStock.mockResolvedValue(undefined);

      const result = await service.create(createSaleDto, 1);

      expect(result).toEqual(mockSale);
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);

      expect(productsRepository.findByIds).toHaveBeenNthCalledWith(
        1, [1, 2], mockManager,
      );

      expect(salesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subtotal: 400,
          discountPercent: 10,
          discountAmount: 40,
          total: 360,
          userId: 1,
        }),
        mockManager,
      );

      expect(inventoryService.decreaseStock).toHaveBeenCalledTimes(2);
      expect(inventoryService.decreaseStock).toHaveBeenCalledWith(1, 2, mockManager);
      expect(inventoryService.decreaseStock).toHaveBeenCalledWith(2, 1, mockManager);

      expect(productsRepository.findByIds).toHaveBeenNthCalledWith(2, [1, 2]);
      expect(inventoryGateway.emitStockUpdate).toHaveBeenCalledTimes(2);
      expect(inventoryGateway.emitStockUpdate).toHaveBeenCalledWith(1, 10);
      expect(inventoryGateway.emitStockUpdate).toHaveBeenCalledWith(2, 5);
    });

    it('should aggregate duplicate productIds and use Map for O(1) lookups', async () => {
      const singleProduct = {
        ...mockProducts[0],
        inventory: { ...mockInventory, productId: 1, quantity: 10 },
      } as unknown as Product;

      productsRepository.findByIds
        .mockResolvedValueOnce([singleProduct])
        .mockResolvedValueOnce([singleProduct]);

      salesRepository.create.mockResolvedValue(mockSale);
      inventoryService.decreaseStock.mockResolvedValue(undefined);

      await service.create({
        items: [
          { productId: 1, quantity: 1 },
          { productId: 1, quantity: 2 },
          { productId: 1, quantity: 3 },
        ],
      }, 1);

      expect(productsRepository.findByIds).toHaveBeenNthCalledWith(1, [1], mockManager);
      expect(inventoryService.decreaseStock).toHaveBeenCalledWith(1, 6, mockManager);
    });

    it('should throw NotFoundException when products are missing', async () => {
      productsRepository.findByIds.mockResolvedValue([mockProducts[0]]);

      await expect(service.create(createSaleDto, 1)).rejects.toThrow(
        NotFoundException,
      );

      expect(inventoryGateway.emitStockUpdate).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when product is inactive', async () => {
      const inactiveProduct = { ...mockProducts[0], isActive: false } as unknown as Product;
      productsRepository.findByIds.mockResolvedValue([inactiveProduct]);

      await expect(service.create({
        items: [{ productId: 1, quantity: 1 }],
      }, 1)).rejects.toThrow(BadRequestException);

      expect(inventoryGateway.emitStockUpdate).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when stock is insufficient', async () => {
      productsRepository.findByIds.mockResolvedValue([mockProducts[0]]);

      await expect(service.create({
        items: [{ productId: 1, quantity: 999 }],
      }, 1)).rejects.toThrow(BadRequestException);

      expect(inventoryGateway.emitStockUpdate).not.toHaveBeenCalled();
    });

    it('should propagate error and NOT emit WebSocket events when transaction fails', async () => {
      dataSource.transaction.mockRejectedValue(new Error('DB connection lost'));

      await expect(service.create(createSaleDto, 1)).rejects.toThrow('DB connection lost');

      expect(inventoryGateway.emitStockUpdate).not.toHaveBeenCalled();
    });

    it('should use product.inventory.quantity for WebSocket emits', async () => {
      const productWithInventory = {
        ...mockProducts[0],
        stock: 999,
        inventory: { ...mockInventory, productId: 1, quantity: 10 },
      } as unknown as Product;

      productsRepository.findByIds
        .mockResolvedValueOnce([productWithInventory])
        .mockResolvedValueOnce([productWithInventory]);

      salesRepository.create.mockResolvedValue(mockSale);
      inventoryService.decreaseStock.mockResolvedValue(undefined);

      await service.create({ items: [{ productId: 1, quantity: 1 }] }, 1);

      expect(inventoryGateway.emitStockUpdate).toHaveBeenCalledWith(1, 10);
      expect(inventoryGateway.emitStockUpdate).not.toHaveBeenCalledWith(1, 999);
    });
  });

  describe('findAll', () => {
    it('should delegate to repository with default pagination', async () => {
      const expectedResult = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      salesRepository.findAllPaginated.mockResolvedValue(expectedResult);

      const result = await service.findAll({});

      expect(salesRepository.findAllPaginated).toHaveBeenCalledWith(1, 20, undefined, undefined, undefined);
      expect(result).toEqual(expectedResult);
    });

    it('should pass query params to repository', async () => {
      const query: SalesQueryDto = {
        page: 2,
        limit: 10,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        status: SaleStatus.COMPLETED,
      };

      await service.findAll(query);

      expect(salesRepository.findAllPaginated).toHaveBeenCalledWith(2, 10, '2024-01-01', '2024-12-31', SaleStatus.COMPLETED);
    });
  });

  describe('findOne', () => {
    it('should return sale when found', async () => {
      salesRepository.findById.mockResolvedValue(mockSale);

      const result = await service.findOne(1);

      expect(result).toEqual(mockSale);
    });

    it('should throw NotFoundException when not found', async () => {
      salesRepository.findById.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should allow PENDING to COMPLETED', async () => {
      const pendingSale = { ...mockSale, status: SaleStatus.PENDING };
      salesRepository.findById.mockResolvedValue(pendingSale);
      salesRepository.save.mockResolvedValue({ ...pendingSale, status: SaleStatus.COMPLETED });

      const result = await service.updateStatus(1, SaleStatus.COMPLETED);

      expect(salesRepository.save).toHaveBeenCalledWith(expect.objectContaining({ status: SaleStatus.COMPLETED }));
      expect(result.status).toBe(SaleStatus.COMPLETED);
    });

    it('should allow PENDING to CANCELLED', async () => {
      const pendingSale = { ...mockSale, status: SaleStatus.PENDING };
      salesRepository.findById.mockResolvedValue(pendingSale);
      salesRepository.save.mockResolvedValue({ ...pendingSale, status: SaleStatus.CANCELLED });

      const result = await service.updateStatus(1, SaleStatus.CANCELLED);

      expect(result.status).toBe(SaleStatus.CANCELLED);
    });

    it('should allow COMPLETED to REFUNDED', async () => {
      const completedSale = { ...mockSale, status: SaleStatus.COMPLETED };
      salesRepository.findById.mockResolvedValue(completedSale);
      salesRepository.save.mockResolvedValue({ ...completedSale, status: SaleStatus.REFUNDED });

      const result = await service.updateStatus(1, SaleStatus.REFUNDED);

      expect(result.status).toBe(SaleStatus.REFUNDED);
    });

    it('should reject invalid transitions', async () => {
      const pendingSale = { ...mockSale, status: SaleStatus.PENDING };
      salesRepository.findById.mockResolvedValue(pendingSale);

      await expect(service.updateStatus(1, SaleStatus.REFUNDED)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when sale does not exist', async () => {
      salesRepository.findById.mockResolvedValue(null);

      await expect(service.updateStatus(999, SaleStatus.COMPLETED)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getInvoice', () => {
    it('should return formatted invoice', async () => {
      const saleWithRelations = {
        ...mockSale,
        user: { name: 'John Doe', email: 'john@store.com' },
        items: [
          {
            product: { name: 'Product A', sku: 'A001' },
            quantity: 2,
            unitPrice: 100,
            subtotal: 200,
          },
        ],
      } as unknown as Sale;

      salesRepository.findById.mockResolvedValue(saleWithRelations);

      const invoice = await service.getInvoice(1);

      expect(invoice.invoiceNumber).toBe(mockSale.invoiceNumber);
      expect(invoice.cashier.name).toBe('John Doe');
      expect(invoice.items).toHaveLength(1);
      expect(invoice.items[0].product).toBe('Product A');
    });
  });

});
