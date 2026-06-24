import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ProductsService } from '../../../src/products/products.service';
import { ProductsRepository } from '../../../src/products/repositories/products.repository';
import { InventoryService } from '../../../src/inventory/inventory.service';
import { AuditLogService } from '../../../src/common/services/audit-log.service';
import { CategoriesRepository } from '../../../src/categories/repositories/categories.repository';
import { CreateProductDto } from '../../../src/products/dto/create-product.dto';
import { UpdateProductDto } from '../../../src/products/dto/update-product.dto';
import { FilterProductDto } from '../../../src/products/dto/filter-product.dto';
import { buildMockProduct, buildMockInventory, buildMockCategory } from '../../fixtures';

describe('ProductsService', () => {
  let service: ProductsService;
  let productsRepository: jest.Mocked<ProductsRepository>;
  let inventoryService: jest.Mocked<InventoryService>;
  let categoriesRepository: jest.Mocked<CategoriesRepository>;
  let dataSource: jest.Mocked<DataSource>;

  const mockManager = {} as EntityManager;

  beforeEach(async () => {
    productsRepository = {
      findById: jest.fn(),
      findByIdOrFail: jest.fn(),
      findByIds: jest.fn(),
      findBySku: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
      findAllPaginated: jest.fn(),
      countActive: jest.fn(),
    } as unknown as jest.Mocked<ProductsRepository>;

    inventoryService = {
      findByProductId: jest.fn(),
      findOrCreate: jest.fn(),
      updateQuantity: jest.fn(),
      getLowStockProducts: jest.fn(),
      decreaseStock: jest.fn(),
      countLowStock: jest.fn(),
      countOutOfStock: jest.fn(),
      getAllStock: jest.fn(),
    } as unknown as jest.Mocked<InventoryService>;

    categoriesRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<CategoriesRepository>;

    dataSource = {
      transaction: jest.fn().mockImplementation(async <T>(cb: (m: EntityManager) => Promise<T>): Promise<T> => {
        return cb(mockManager);
      }),
    } as unknown as jest.Mocked<DataSource>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: ProductsRepository, useValue: productsRepository },
        { provide: InventoryService, useValue: inventoryService },
        { provide: CategoriesRepository, useValue: categoriesRepository },
        { provide: DataSource, useValue: dataSource },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('create', () => {
    const createDto: CreateProductDto = {
      name: 'Gaming Mouse',
      price: 49.99,
      stock: 100,
      categoryId: 1,
      sku: 'SKU-GM-001',
    };

    it('should create product successfully', async () => {
      const mockProduct = buildMockProduct({ id: 1, name: 'Gaming Mouse', price: 49.99 });
      categoriesRepository.findById.mockResolvedValue(buildMockCategory({ id: 1 }));
      productsRepository.findBySku.mockResolvedValue(null);
      productsRepository.create.mockResolvedValue(mockProduct);
      productsRepository.findByIdOrFail.mockResolvedValue(mockProduct);
      inventoryService.findOrCreate.mockResolvedValue(buildMockInventory({ productId: 1, quantity: 100 }));

      const result = await service.create(createDto);

      expect(categoriesRepository.findById).toHaveBeenCalledWith(1);
      expect(productsRepository.findBySku).toHaveBeenCalledWith('SKU-GM-001');
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(productsRepository.create).toHaveBeenCalledWith({
        name: 'Gaming Mouse',
        price: 49.99,
        categoryId: 1,
        sku: 'SKU-GM-001',
      }, mockManager);
      expect(inventoryService.findOrCreate).toHaveBeenCalledWith(1, 100, mockManager);
      expect(result).toBe(mockProduct);
    });

    it('should reject duplicate SKU', async () => {
      categoriesRepository.findById.mockResolvedValue(buildMockCategory({ id: 1 }));
      productsRepository.findBySku.mockResolvedValue(buildMockProduct({ sku: 'SKU-GM-001' }));

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      expect(productsRepository.create).not.toHaveBeenCalled();
    });

    it('should create inventory record', async () => {
      categoriesRepository.findById.mockResolvedValue(buildMockCategory({ id: 1 }));
      productsRepository.findBySku.mockResolvedValue(null);
      productsRepository.create.mockResolvedValue(buildMockProduct({ id: 1 }));
      productsRepository.findByIdOrFail.mockResolvedValue(buildMockProduct({ id: 1 }));
      inventoryService.findOrCreate.mockResolvedValue(buildMockInventory({ productId: 1, quantity: 100 }));

      await service.create(createDto);

      expect(inventoryService.findOrCreate).toHaveBeenCalledWith(1, 100, mockManager);
    });

    it('should default stock to 0 when not provided', async () => {
      const dtoWithoutStock: CreateProductDto = {
        name: 'Test',
        price: 10,
        stock: 0,
        categoryId: 1,
      };
      categoriesRepository.findById.mockResolvedValue(buildMockCategory({ id: 1 }));
      productsRepository.findBySku.mockResolvedValue(null);
      productsRepository.create.mockResolvedValue(buildMockProduct({ id: 2 }));
      productsRepository.findByIdOrFail.mockResolvedValue(buildMockProduct({ id: 2 }));
      inventoryService.findOrCreate.mockResolvedValue(buildMockInventory({ productId: 2, quantity: 0 }));

      await service.create(dtoWithoutStock);

      expect(inventoryService.findOrCreate).toHaveBeenCalledWith(2, 0, mockManager);
    });

    it('should skip SKU check when SKU is not provided', async () => {
      const dtoWithoutSku: CreateProductDto = {
        name: 'No SKU Item',
        price: 5.99,
        stock: 10,
        categoryId: 1,
      };
      categoriesRepository.findById.mockResolvedValue(buildMockCategory({ id: 1 }));
      productsRepository.create.mockResolvedValue(buildMockProduct({ id: 3, name: 'No SKU Item' }));
      productsRepository.findByIdOrFail.mockResolvedValue(buildMockProduct({ id: 3, name: 'No SKU Item' }));
      inventoryService.findOrCreate.mockResolvedValue(buildMockInventory({ productId: 3, quantity: 10 }));

      await service.create(dtoWithoutSku);

      expect(productsRepository.findBySku).not.toHaveBeenCalled();
      expect(productsRepository.create).toHaveBeenCalled();
    });

    it('should reject non-existent categoryId', async () => {
      categoriesRepository.findById.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      expect(productsRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      const filterDto = new FilterProductDto();
      const paginatedResult = {
        data: [buildMockProduct(), buildMockProduct({ id: 2, name: 'Product 2' })],
        meta: { total: 2, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPrevPage: false },
      };
      productsRepository.findAllPaginated.mockResolvedValue(paginatedResult);

      const result = await service.findAll(filterDto);

      expect(productsRepository.findAllPaginated).toHaveBeenCalledWith(filterDto);
      expect(result).toEqual(paginatedResult);
    });
  });

  describe('findOne', () => {
    it('should find product by id', async () => {
      const mockProduct = buildMockProduct({ id: 1 });
      productsRepository.findByIdOrFail.mockResolvedValue(mockProduct);

      const result = await service.findOne(1);

      expect(productsRepository.findByIdOrFail).toHaveBeenCalledWith(1);
      expect(result).toBe(mockProduct);
    });

    it('should throw NotFoundException', async () => {
      productsRepository.findByIdOrFail.mockRejectedValue(
        new NotFoundException('Product with ID 999 not found'),
      );

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update product successfully', async () => {
      const existing = buildMockProduct({ id: 1, name: 'Old Name', sku: 'SKU-OLD' });
      const updateDto: UpdateProductDto = { name: 'New Name' };
      const updated = buildMockProduct({ id: 1, name: 'New Name', sku: 'SKU-OLD' });

      productsRepository.findByIdOrFail.mockResolvedValue(existing);
      productsRepository.save.mockResolvedValue(updated);
      productsRepository.findByIdOrFail.mockResolvedValue(updated);

      const result = await service.update(1, updateDto);

      expect(productsRepository.findByIdOrFail).toHaveBeenCalledWith(1);
      expect(productsRepository.save).toHaveBeenCalled();
      expect(result.name).toBe('New Name');
    });

    it('should throw NotFoundException', async () => {
      productsRepository.findByIdOrFail.mockRejectedValue(
        new NotFoundException('Product with ID 999 not found'),
      );

      await expect(service.update(999, { name: 'Test' })).rejects.toThrow(NotFoundException);
    });

    it('should reject duplicate SKU', async () => {
      const existing = buildMockProduct({ id: 1, sku: 'SKU-ORIGINAL' });
      productsRepository.findByIdOrFail.mockResolvedValue(existing);
      productsRepository.findBySku.mockResolvedValue(
        buildMockProduct({ id: 2, sku: 'SKU-TAKEN' }),
      );

      await expect(
        service.update(1, { sku: 'SKU-TAKEN' }),
      ).rejects.toThrow(ConflictException);
      expect(productsRepository.save).not.toHaveBeenCalled();
    });

    it('should allow keeping the same SKU', async () => {
      const existing = buildMockProduct({ id: 1, sku: 'SKU-SAME' });
      const updateDto: UpdateProductDto = { sku: 'SKU-SAME' };
      productsRepository.findByIdOrFail.mockResolvedValue(existing);
      productsRepository.save.mockResolvedValue(existing);
      productsRepository.findByIdOrFail.mockResolvedValue(existing);

      await service.update(1, updateDto);

      expect(productsRepository.findBySku).not.toHaveBeenCalled();
    });

    it('should update stock when provided', async () => {
      const existing = buildMockProduct({ id: 1, sku: 'SKU-STOCK' });
      const updateDto: UpdateProductDto = { stock: 200 };
      productsRepository.findByIdOrFail.mockResolvedValue(existing);
      productsRepository.save.mockResolvedValue(existing);
      productsRepository.findByIdOrFail.mockResolvedValue(existing);

      await service.update(1, updateDto);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(inventoryService.updateQuantity).toHaveBeenCalledWith(1, 200, mockManager);
    });

    it('should not update stock when stock is not provided', async () => {
      const existing = buildMockProduct({ id: 1 });
      const updateDto: UpdateProductDto = { name: 'Only Name' };
      productsRepository.findByIdOrFail.mockResolvedValue(existing);
      productsRepository.save.mockResolvedValue(existing);
      productsRepository.findByIdOrFail.mockResolvedValue(existing);

      await service.update(1, updateDto);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(inventoryService.updateQuantity).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should deactivate product', async () => {
      const mockProduct = buildMockProduct({ id: 1 });
      productsRepository.findByIdOrFail.mockResolvedValue(mockProduct);
      productsRepository.softDelete.mockResolvedValue(undefined);

      await service.remove(1);

      expect(productsRepository.findByIdOrFail).toHaveBeenCalledWith(1);
      expect(productsRepository.softDelete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException', async () => {
      productsRepository.findByIdOrFail.mockRejectedValue(
        new NotFoundException('Product with ID 999 not found'),
      );

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      expect(productsRepository.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('updateStock', () => {
    it('should increase stock for positive change', async () => {
      const mockProduct = buildMockProduct({ id: 1, name: 'Test' });
      const mockInventory = buildMockInventory({ productId: 1, quantity: 50 });
      productsRepository.findById.mockResolvedValue(mockProduct);
      inventoryService.findByProductId.mockResolvedValue(mockInventory);
      productsRepository.findByIdOrFail.mockResolvedValue(mockProduct);

      await service.updateStock(1, 10);

      expect(inventoryService.updateQuantity).toHaveBeenCalledWith(1, 60);
    });

    it('should decrease stock for negative change', async () => {
      const mockProduct = buildMockProduct({ id: 1, name: 'Test' });
      const mockInventory = buildMockInventory({ productId: 1, quantity: 50 });
      productsRepository.findById.mockResolvedValue(mockProduct);
      inventoryService.findByProductId.mockResolvedValue(mockInventory);
      productsRepository.findByIdOrFail.mockResolvedValue(mockProduct);

      await service.updateStock(1, -10);

      expect(inventoryService.updateQuantity).toHaveBeenCalledWith(1, 40);
    });

    it('should throw NotFoundException when product not found', async () => {
      productsRepository.findById.mockResolvedValue(null);

      await expect(service.updateStock(999, 5)).rejects.toThrow(NotFoundException);
      expect(inventoryService.updateQuantity).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when stock would go negative', async () => {
      const mockProduct = buildMockProduct({ id: 1, name: 'Test' });
      const mockInventory = buildMockInventory({ productId: 1, quantity: 5 });
      productsRepository.findById.mockResolvedValue(mockProduct);
      inventoryService.findByProductId.mockResolvedValue(mockInventory);

      await expect(service.updateStock(1, -10)).rejects.toThrow(BadRequestException);
      expect(inventoryService.updateQuantity).not.toHaveBeenCalled();
    });
  });

  describe('getLowStockProducts', () => {
    it('should return low stock products', async () => {
      const mockInventories = [
        buildMockInventory({ productId: 1, quantity: 5 }),
        buildMockInventory({ productId: 2, quantity: 3 }),
      ];
      inventoryService.getLowStockProducts.mockResolvedValue(mockInventories);

      const result = await service.getLowStockProducts(10);

      expect(inventoryService.getLowStockProducts).toHaveBeenCalledWith(10);
      expect(result).toEqual(mockInventories);
    });

    it('should use default threshold', async () => {
      inventoryService.getLowStockProducts.mockResolvedValue([]);

      await service.getLowStockProducts();

      expect(inventoryService.getLowStockProducts).toHaveBeenCalledWith(10);
    });

    it('should respect custom threshold', async () => {
      inventoryService.getLowStockProducts.mockResolvedValue([]);

      await service.getLowStockProducts(25);

      expect(inventoryService.getLowStockProducts).toHaveBeenCalledWith(25);
    });
  });
});
