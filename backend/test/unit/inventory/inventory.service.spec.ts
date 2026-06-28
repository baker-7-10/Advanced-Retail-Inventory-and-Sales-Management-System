import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { InventoryService } from '../../../src/inventory/inventory.service';
import { InventoryRepository } from '../../../src/inventory/repositories/inventory.repository';
import { InventoryGateway } from '../../../src/inventory/inventory.gateway';
import { AuditLogService } from '../../../src/common/services/audit-log.service';
import { buildMockInventory } from '../../fixtures';

const mockManager = {} as EntityManager;

describe('InventoryService', () => {
  let service: InventoryService;
  let repo: jest.Mocked<InventoryRepository>;

  function createMockInventory(overrides = {}) {
    return buildMockInventory({ id: 1, productId: 1, quantity: 50, minimumStock: 10, ...overrides });
  }

  beforeEach(async () => {
    repo = {
      findByProductId: jest.fn(),
      findByProductIdWithLock: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      decrement: jest.fn(),
      countLowStock: jest.fn(),
      countOutOfStock: jest.fn(),
      countTotalProducts: jest.fn(),
      findAllWithStock: jest.fn(),
      findLowStock: jest.fn(),
    } as unknown as jest.Mocked<InventoryRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: InventoryRepository, useValue: repo },
        { provide: InventoryGateway, useValue: { emitStockUpdate: jest.fn() } },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  describe('findByProductId', () => {
    it('should return inventory when found', async () => {
      const inv = createMockInventory();
      repo.findByProductId.mockResolvedValue(inv);

      const result = await service.findByProductId(1);

      expect(repo.findByProductId).toHaveBeenCalledWith(1, undefined);
      expect(result).toBe(inv);
    });

    it('should throw NotFoundException when not found', async () => {
      repo.findByProductId.mockResolvedValue(null);

      await expect(service.findByProductId(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOrCreate', () => {
    it('should return existing inventory', async () => {
      const inv = createMockInventory();
      repo.findByProductId.mockResolvedValue(inv);

      const result = await service.findOrCreate(1, 100);

      expect(repo.findByProductId).toHaveBeenCalledWith(1, undefined);
      expect(repo.create).not.toHaveBeenCalled();
      expect(result).toEqual(inv);
    });

    it('should create inventory when not found', async () => {
      const inv = createMockInventory();
      repo.findByProductId.mockResolvedValue(null);
      repo.create.mockResolvedValue(inv);

      const result = await service.findOrCreate(1, 100);

      expect(repo.findByProductId).toHaveBeenCalledWith(1, undefined);
      expect(repo.create).toHaveBeenCalledWith({ productId: 1, quantity: 100 }, undefined);
      expect(result).toEqual(inv);
    });
  });

  describe('decreaseStock', () => {
    it('should decrease stock when sufficient', async () => {
      const inv = createMockInventory();
      repo.findByProductIdWithLock.mockResolvedValue(inv);

      await service.decreaseStock(1, 10, mockManager);

      expect(repo.findByProductIdWithLock).toHaveBeenCalledWith(1, mockManager);
      expect(repo.decrement).toHaveBeenCalledWith(1, 10, mockManager);
    });

    it('should throw NotFoundException when inventory not found', async () => {
      repo.findByProductIdWithLock.mockResolvedValue(null);

      await expect(service.decreaseStock(999, 10, mockManager)).rejects.toThrow(NotFoundException);
      expect(repo.decrement).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when insufficient stock', async () => {
      const inv = createMockInventory();
      repo.findByProductIdWithLock.mockResolvedValue(inv);

      await expect(service.decreaseStock(1, 100, mockManager)).rejects.toThrow(BadRequestException);
      expect(repo.decrement).not.toHaveBeenCalled();
    });
  });

  describe('updateQuantity', () => {
    it('should update quantity', async () => {
      const inv = createMockInventory();
      repo.findByProductId.mockResolvedValue(inv);
      repo.save.mockResolvedValue(inv);

      await service.updateQuantity(1, 200);

      expect(repo.findByProductId).toHaveBeenCalledWith(1, undefined);
      expect(repo.save).toHaveBeenCalledWith(inv, undefined);
      expect(inv.quantity).toBe(200);
    });

    it('should throw NotFoundException when not found', async () => {
      repo.findByProductId.mockResolvedValue(null);

      await expect(service.updateQuantity(999, 100)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMinimumStock', () => {
    it('should update minimum stock', async () => {
      const inv = createMockInventory();
      repo.findByProductId.mockResolvedValue(inv);
      repo.save.mockResolvedValue(inv);

      await service.updateMinimumStock(1, 25);

      expect(repo.findByProductId).toHaveBeenCalledWith(1);
      expect(repo.save).toHaveBeenCalledWith(inv);
      expect(inv.minimumStock).toBe(25);
    });

    it('should throw NotFoundException when not found', async () => {
      repo.findByProductId.mockResolvedValue(null);

      await expect(service.updateMinimumStock(999, 5)).rejects.toThrow(NotFoundException);
    });
  });

  describe('countLowStock', () => {
    it('should return low stock count', async () => {
      repo.countLowStock.mockResolvedValue(3);

      const result = await service.countLowStock(10);

      expect(repo.countLowStock).toHaveBeenCalledWith(10);
      expect(result).toBe(3);
    });
  });

  describe('countOutOfStock', () => {
    it('should return out of stock count', async () => {
      repo.countOutOfStock.mockResolvedValue(2);

      const result = await service.countOutOfStock();

      expect(repo.countOutOfStock).toHaveBeenCalled();
      expect(result).toBe(2);
    });
  });

  describe('countTotalProducts', () => {
    it('should return total products count', async () => {
      repo.countTotalProducts.mockResolvedValue(100);

      const result = await service.countTotalProducts();

      expect(repo.countTotalProducts).toHaveBeenCalled();
      expect(result).toBe(100);
    });
  });

  describe('getStats', () => {
    it('should return aggregated stats', async () => {
      repo.countTotalProducts.mockResolvedValue(100);
      repo.countLowStock.mockResolvedValue(5);
      repo.countOutOfStock.mockResolvedValue(2);

      const result = await service.getStats();

      expect(repo.countTotalProducts).toHaveBeenCalled();
      expect(repo.countLowStock).toHaveBeenCalled();
      expect(repo.countOutOfStock).toHaveBeenCalled();
      expect(result).toEqual({
        totalProducts: 100,
        lowStockProducts: 5,
        outOfStockProducts: 2,
      });
    });
  });

  describe('getLowStockProducts', () => {
    it('should return low stock inventory items', async () => {
      const inv = createMockInventory();
      const items = [inv];
      repo.findLowStock.mockResolvedValue(items);

      const result = await service.getLowStockProducts(10);

      expect(repo.findLowStock).toHaveBeenCalledWith(10, 1, 50);
      expect(result).toEqual(items);
    });
  });

  describe('getAllStock', () => {
    it('should return paginated stock with defaults', async () => {
      const inv = createMockInventory();
      const items = [inv];
      repo.findAllWithStock.mockResolvedValue(items);

      const result = await service.getAllStock();

      expect(repo.findAllWithStock).toHaveBeenCalledWith(1, 50);
      expect(result).toEqual(items);
    });

    it('should pass custom pagination params', async () => {
      repo.findAllWithStock.mockResolvedValue([]);

      await service.getAllStock(2, 25);

      expect(repo.findAllWithStock).toHaveBeenCalledWith(2, 25);
    });
  });
});
