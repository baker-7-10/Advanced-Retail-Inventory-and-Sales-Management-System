import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from '../../../src/inventory/inventory.controller';
import { InventoryService } from '../../../src/inventory/inventory.service';
import { LowStockQueryDto } from '../../../src/inventory/dto/low-stock-query.dto';
import { UpdateMinimumStockDto } from '../../../src/inventory/dto/update-minimum-stock.dto';
import { buildMockInventory } from '../../fixtures';

describe('InventoryController', () => {
  let controller: InventoryController;
  let service: jest.Mocked<InventoryService>;

  const mockInventory = buildMockInventory({ id: 1, productId: 1, quantity: 50, minimumStock: 10 });

  beforeEach(async () => {
    service = {
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

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        { provide: InventoryService, useValue: service },
      ],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
  });

  describe('getLowStock', () => {
    it('should call getLowStockProducts with threshold from query', async () => {
      const items = [mockInventory];
      service.getLowStockProducts.mockResolvedValue(items as any);

      const query = new LowStockQueryDto();
      query.threshold = 5;
      const result = await controller.getLowStock(query);

      expect(service.getLowStockProducts).toHaveBeenCalledWith(5, 1, 50);
      expect(result).toEqual(items);
    });

    it('should use default threshold when not provided', async () => {
      service.getLowStockProducts.mockResolvedValue([]);

      const query = new LowStockQueryDto();
      await controller.getLowStock(query);

      expect(service.getLowStockProducts).toHaveBeenCalledWith(10, 1, 50);
    });
  });

  describe('getStats', () => {
    it('should return inventory stats', async () => {
      const stats = { totalProducts: 100, lowStockProducts: 5, outOfStockProducts: 2 };
      service.getStats.mockResolvedValue(stats as any);

      const result = await controller.getStats();

      expect(service.getStats).toHaveBeenCalled();
      expect(result).toEqual(stats);
    });
  });

  describe('updateMinimumStock', () => {
    it('should call updateMinimumStock with productId and dto', async () => {
      const updated = { ...mockInventory, minimumStock: 20 };
      service.updateMinimumStock.mockResolvedValue(updated as any);

      const dto: UpdateMinimumStockDto = { minimumStock: 20 };
      const result = await controller.updateMinimumStock(1, dto, { id: 1 } as any);

      expect(service.updateMinimumStock).toHaveBeenCalledWith(1, 20, 1);
      expect(result).toEqual(updated);
    });
  });
});
