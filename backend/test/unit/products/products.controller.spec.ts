import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from '../../../src/products/products.controller';
import { ProductsService } from '../../../src/products/products.service';
import { CreateProductDto } from '../../../src/products/dto/create-product.dto';
import { UpdateProductDto } from '../../../src/products/dto/update-product.dto';
import { FilterProductDto } from '../../../src/products/dto/filter-product.dto';
import { buildMockProduct, buildMockInventory } from '../../fixtures';

describe('ProductsController', () => {
  let controller: ProductsController;
  let productsService: jest.Mocked<ProductsService>;

  beforeEach(async () => {
    productsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      updateStock: jest.fn(),
      getLowStockProducts: jest.fn(),
      search: jest.fn(),
    } as unknown as jest.Mocked<ProductsService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: ProductsService, useValue: productsService },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  describe('create', () => {
    it('should call productsService.create with the DTO', async () => {
      const dto: CreateProductDto = {
        name: 'Gaming Mouse',
        price: 49.99,
        stock: 100,
        categoryId: 1,
        sku: 'SKU-GM-001',
      };
      const mockProduct = buildMockProduct({ ...dto, stock: 100 } as any);
      productsService.create.mockResolvedValue(mockProduct as any);

      const result = await controller.create(dto, { id: 1 } as any);

      expect(productsService.create).toHaveBeenCalledWith(dto, 1);
      expect(result).toEqual(mockProduct);
    });
  });

  describe('findAll', () => {
    it('should call productsService.findAll with filter DTO', async () => {
      const filterDto = new FilterProductDto();
      const paginatedResult = {
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false, hasPrevPage: false },
      };
      productsService.findAll.mockResolvedValue(paginatedResult as any);

      const result = await controller.findAll(filterDto);

      expect(productsService.findAll).toHaveBeenCalledWith(filterDto);
      expect(result).toEqual(paginatedResult);
    });
  });

  describe('search', () => {
    it('should call productsService.search with SearchProductDto', async () => {
      const searchDto = { q: 'mouse', page: 2, limit: 10 };
      const paginatedResult = {
        data: [],
        meta: { total: 0, page: 2, limit: 10, totalPages: 0, hasNextPage: false, hasPrevPage: false },
      };
      productsService.search.mockResolvedValue(paginatedResult as any);

      const result = await controller.search(searchDto as any);

      expect(productsService.search).toHaveBeenCalledWith(searchDto);
      expect(result).toEqual(paginatedResult);
    });
  });

  describe('findOne', () => {
    it('should call productsService.findOne with the id', async () => {
      const mockProduct = buildMockProduct({ id: 1 });
      productsService.findOne.mockResolvedValue(mockProduct as any);

      const result = await controller.findOne(1);

      expect(productsService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockProduct);
    });
  });

  describe('update', () => {
    it('should call productsService.update with id and DTO', async () => {
      const dto: UpdateProductDto = { name: 'Updated Name' };
      const mockProduct = buildMockProduct({ id: 1, name: 'Updated Name' });
      productsService.update.mockResolvedValue(mockProduct as any);

      const result = await controller.update(1, dto, { id: 1 } as any);

      expect(productsService.update).toHaveBeenCalledWith(1, dto, 1);
      expect(result).toEqual(mockProduct);
    });
  });

  describe('remove', () => {
    it('should call productsService.remove with the id', async () => {
      productsService.remove.mockResolvedValue(undefined);

      await controller.remove(1, { id: 1 } as any);

      expect(productsService.remove).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('getLowStock', () => {
    it('should call productsService.getLowStockProducts with default threshold', async () => {
      const mockInventories = [buildMockInventory({ quantity: 5 })];
      productsService.getLowStockProducts.mockResolvedValue(mockInventories as any);

      const result = await controller.getLowStock(10);

      expect(productsService.getLowStockProducts).toHaveBeenCalledWith(10);
      expect(result).toEqual(mockInventories);
    });

    it('should pass custom threshold', async () => {
      productsService.getLowStockProducts.mockResolvedValue([]);

      await controller.getLowStock(25);

      expect(productsService.getLowStockProducts).toHaveBeenCalledWith(25);
    });
  });
});
