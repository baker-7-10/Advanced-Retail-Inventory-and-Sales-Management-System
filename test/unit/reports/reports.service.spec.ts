import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from '../../../src/reports/reports.service';
import { SalesRepository } from '../../../src/sales/repositories/sales.repository';
import { SaleItemsRepository } from '../../../src/sales/repositories/sale-items.repository';
import { ProductsRepository } from '../../../src/products/repositories/products.repository';
import { InventoryService } from '../../../src/inventory/inventory.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let salesRepository: jest.Mocked<SalesRepository>;
  let saleItemsRepository: jest.Mocked<SaleItemsRepository>;
  let productsRepository: jest.Mocked<ProductsRepository>;
  let inventoryService: jest.Mocked<InventoryService>;

  beforeEach(async () => {
    salesRepository = {
      getSalesSummary: jest.fn(),
      getSalesByDay: jest.fn(),
    } as unknown as jest.Mocked<SalesRepository>;

    saleItemsRepository = {
      findTopProducts: jest.fn(),
      findSalesByCategory: jest.fn(),
    } as unknown as jest.Mocked<SaleItemsRepository>;

    productsRepository = {
      countActive: jest.fn(),
    } as unknown as jest.Mocked<ProductsRepository>;

    inventoryService = {
      countLowStock: jest.fn(),
      countOutOfStock: jest.fn(),
      getAllStock: jest.fn(),
    } as unknown as jest.Mocked<InventoryService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: SalesRepository, useValue: salesRepository },
        { provide: SaleItemsRepository, useValue: saleItemsRepository },
        { provide: ProductsRepository, useValue: productsRepository },
        { provide: InventoryService, useValue: inventoryService },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  describe('getSalesSummary', () => {
    it('should delegate to salesRepository.getSalesSummary', async () => {
      const expected = { totalTransactions: 10, totalRevenue: 5000 };
      salesRepository.getSalesSummary.mockResolvedValue(expected);

      const result = await service.getSalesSummary('2024-01-01', '2024-12-31');

      expect(salesRepository.getSalesSummary).toHaveBeenCalledWith('2024-01-01', '2024-12-31');
      expect(result).toEqual(expected);
    });

    it('should call without dates when not provided', async () => {
      salesRepository.getSalesSummary.mockResolvedValue({});

      await service.getSalesSummary();

      expect(salesRepository.getSalesSummary).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  describe('getTopProducts', () => {
    it('should delegate to saleItemsRepository.findTopProducts', async () => {
      const expected = [{ productId: 1, productName: 'A', totalSold: 20 }];
      saleItemsRepository.findTopProducts.mockResolvedValue(expected);

      const result = await service.getTopProducts(5, '2024-01-01', '2024-12-31');

      expect(saleItemsRepository.findTopProducts).toHaveBeenCalledWith(5, '2024-01-01', '2024-12-31', 1);
      expect(result).toEqual(expected);
    });

    it('should use default limit of 10', async () => {
      saleItemsRepository.findTopProducts.mockResolvedValue([]);

      await service.getTopProducts();

      expect(saleItemsRepository.findTopProducts).toHaveBeenCalledWith(10, undefined, undefined, 1);
    });
  });

  describe('getSalesByDay', () => {
    it('should delegate to salesRepository.getSalesByDay', async () => {
      const expected = [{ date: '2024-01-15', transactions: 5, revenue: 2500 }];
      salesRepository.getSalesByDay.mockResolvedValue(expected);

      const result = await service.getSalesByDay('2024-01-01', '2024-01-31');

      expect(salesRepository.getSalesByDay).toHaveBeenCalledWith('2024-01-01', '2024-01-31');
      expect(result).toEqual(expected);
    });
  });

  describe('getSalesByCategory', () => {
    it('should delegate to saleItemsRepository.findSalesByCategory', async () => {
      const expected = [{ categoryName: 'Electronics', totalSold: 50 }];
      saleItemsRepository.findSalesByCategory.mockResolvedValue(expected);

      const result = await service.getSalesByCategory('2024-01-01', '2024-12-31');

      expect(saleItemsRepository.findSalesByCategory).toHaveBeenCalledWith('2024-01-01', '2024-12-31', 1, 50);
      expect(result).toEqual(expected);
    });
  });

  describe('getStockReport', () => {
    it('should return aggregated stock data', async () => {
      productsRepository.countActive.mockResolvedValue(100);
      inventoryService.countLowStock.mockResolvedValue(5);
      inventoryService.countOutOfStock.mockResolvedValue(2);
      inventoryService.getAllStock.mockResolvedValue([{ id: 1, productId: 1, quantity: 50 } as any]);

      const result = await service.getStockReport(20);

      expect(productsRepository.countActive).toHaveBeenCalled();
      expect(inventoryService.countLowStock).toHaveBeenCalledWith(20);
      expect(inventoryService.countOutOfStock).toHaveBeenCalled();
      expect(inventoryService.getAllStock).toHaveBeenCalled();
      expect(result).toEqual({
        summary: { totalProducts: 100, lowStock: 5, outOfStock: 2 },
        products: [{ id: 1, productId: 1, quantity: 50 }],
      });
    });

    it('should use default threshold of 10', async () => {
      productsRepository.countActive.mockResolvedValue(0);
      inventoryService.countLowStock.mockResolvedValue(0);
      inventoryService.countOutOfStock.mockResolvedValue(0);
      inventoryService.getAllStock.mockResolvedValue([]);

      await service.getStockReport();

      expect(inventoryService.countLowStock).toHaveBeenCalledWith(10);
    });
  });
});
