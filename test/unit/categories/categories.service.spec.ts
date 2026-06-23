import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from '../../../src/categories/categories.service';
import { CategoriesRepository } from '../../../src/categories/repositories/categories.repository';
import { ProductsRepository } from '../../../src/products/repositories/products.repository';
import { AuditLogService } from '../../../src/common/services/audit-log.service';
import { Category } from '../../../src/categories/entities/category.entity';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let categoriesRepository: jest.Mocked<CategoriesRepository>;
  let productsRepository: jest.Mocked<ProductsRepository>;

  const mockCategory = (overrides: Partial<Category> = {}): Category =>
    Object.assign(new Category(), {
      id: 1,
      name: 'Electronics',
      description: 'Devices',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

  beforeEach(async () => {
    categoriesRepository = {
      findById: jest.fn(),
      findByIdOrFail: jest.fn(),
      findByName: jest.fn(),
      findByNameInsensitive: jest.fn(),
      findAllPaginated: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<CategoriesRepository>;

    productsRepository = {
      countActiveByCategory: jest.fn(),
    } as unknown as jest.Mocked<ProductsRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: CategoriesRepository, useValue: categoriesRepository },
        { provide: ProductsRepository, useValue: productsRepository },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  describe('create', () => {
    it('should create a category when name does not exist', async () => {
      categoriesRepository.findByNameInsensitive.mockResolvedValue(null);
      categoriesRepository.create.mockResolvedValue(mockCategory());

      const result = await service.create({ name: 'Electronics', description: 'Devices' });

      expect(categoriesRepository.findByNameInsensitive).toHaveBeenCalledWith('Electronics');
      expect(categoriesRepository.create).toHaveBeenCalledWith({
        name: 'Electronics',
        description: 'Devices',
      });
      expect(result.name).toBe('Electronics');
    });

    it('should throw ConflictException when category name exists (case-insensitive)', async () => {
      categoriesRepository.findByNameInsensitive.mockResolvedValue(mockCategory());

      await expect(
        service.create({ name: 'electronics', description: 'Devices' }),
      ).rejects.toThrow(ConflictException);

      expect(categoriesRepository.create).not.toHaveBeenCalled();
    });

    it('should trim whitespace from category name', async () => {
      categoriesRepository.findByNameInsensitive.mockResolvedValue(null);
      categoriesRepository.create.mockResolvedValue(mockCategory());

      await service.create({ name: '  Electronics  ', description: 'Devices' });

      expect(categoriesRepository.findByNameInsensitive).toHaveBeenCalledWith('Electronics');
      expect(categoriesRepository.create).toHaveBeenCalledWith({
        name: 'Electronics',
        description: 'Devices',
      });
    });
  });

  describe('update', () => {
    it('should update category when new name is unique', async () => {
      const category = mockCategory();
      categoriesRepository.findByIdOrFail.mockResolvedValue(category);
      categoriesRepository.findByNameInsensitive.mockResolvedValue(null);
      categoriesRepository.save.mockResolvedValue({ ...category, name: 'Computers' });

      const result = await service.update(1, { name: 'Computers' });

      expect(categoriesRepository.findByNameInsensitive).toHaveBeenCalledWith('Computers');
      expect(categoriesRepository.save).toHaveBeenCalled();
      expect(result.name).toBe('Computers');
    });

    it('should allow updating with the same name (same category)', async () => {
      const category = mockCategory();
      categoriesRepository.findByIdOrFail.mockResolvedValue(category);
      categoriesRepository.findByNameInsensitive.mockResolvedValue(category);
      categoriesRepository.save.mockResolvedValue(category);

      const result = await service.update(1, { name: 'Electronics' });

      expect(categoriesRepository.findByNameInsensitive).toHaveBeenCalledWith('Electronics');
      expect(categoriesRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when new name belongs to a different category', async () => {
      const category = mockCategory({ id: 1, name: 'Computers' });
      const existing = mockCategory({ id: 2, name: 'Electronics' });
      categoriesRepository.findByIdOrFail.mockResolvedValue(category);
      categoriesRepository.findByNameInsensitive.mockResolvedValue(existing);

      await expect(service.update(1, { name: 'Electronics' })).rejects.toThrow(ConflictException);

      expect(categoriesRepository.save).not.toHaveBeenCalled();
    });

    it('should skip duplicate check when name is not provided', async () => {
      const category = mockCategory();
      categoriesRepository.findByIdOrFail.mockResolvedValue(category);
      categoriesRepository.save.mockResolvedValue(category);

      await service.update(1, { description: 'Updated desc' });

      expect(categoriesRepository.findByNameInsensitive).not.toHaveBeenCalled();
      expect(categoriesRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when category does not exist', async () => {
      categoriesRepository.findByIdOrFail.mockRejectedValue(new NotFoundException());

      await expect(service.update(999, { name: 'Test' })).rejects.toThrow();
    });
  });

  describe('deactivate', () => {
    it('should deactivate category when no active products', async () => {
      categoriesRepository.findByIdOrFail.mockResolvedValue(mockCategory());
      productsRepository.countActiveByCategory.mockResolvedValue(0);

      await service.deactivate(1);

      expect(productsRepository.countActiveByCategory).toHaveBeenCalledWith(1);
      expect(categoriesRepository.softDelete).toHaveBeenCalledWith(1);
    });

    it('should throw BadRequestException when category has active products', async () => {
      categoriesRepository.findByIdOrFail.mockResolvedValue(mockCategory());
      productsRepository.countActiveByCategory.mockResolvedValue(5);

      await expect(service.deactivate(1)).rejects.toThrow(BadRequestException);

      expect(categoriesRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when category is already inactive', async () => {
      categoriesRepository.findByIdOrFail.mockResolvedValue(mockCategory({ isActive: false }));

      await expect(service.deactivate(1)).rejects.toThrow(BadRequestException);

      expect(productsRepository.countActiveByCategory).not.toHaveBeenCalled();
      expect(categoriesRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when category does not exist', async () => {
      categoriesRepository.findByIdOrFail.mockRejectedValue(new NotFoundException());

      await expect(service.deactivate(999)).rejects.toThrow();
    });
  });

  describe('findAll (pagination)', () => {
    it('should delegate to repository with query parameters', async () => {
      const expected = { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      categoriesRepository.findAllPaginated.mockResolvedValue(expected);

      const result = await service.findAll({ page: 2, limit: 10, search: 'Electronics', isActive: true });

      expect(categoriesRepository.findAllPaginated).toHaveBeenCalledWith(2, 10, 'Electronics', true);
      expect(result).toEqual(expected);
    });

    it('should use default values when not provided', async () => {
      const expected = { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      categoriesRepository.findAllPaginated.mockResolvedValue(expected);

      const result = await service.findAll({});

      expect(categoriesRepository.findAllPaginated).toHaveBeenCalledWith(1, 20, undefined, undefined);
      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('should return category when found', async () => {
      const category = mockCategory();
      categoriesRepository.findByIdOrFail.mockResolvedValue(category);

      const result = await service.findOne(1);

      expect(categoriesRepository.findByIdOrFail).toHaveBeenCalledWith(1);
      expect(result).toEqual(category);
    });

    it('should throw when not found', async () => {
      categoriesRepository.findByIdOrFail.mockRejectedValue(new NotFoundException());

      await expect(service.findOne(999)).rejects.toThrow();
    });
  });
});
