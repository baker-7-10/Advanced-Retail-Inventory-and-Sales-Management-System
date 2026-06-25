import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ProductsRepository } from '../../../src/products/repositories/products.repository';
import { Product } from '../../../src/products/entities/product.entity';
import { FilterProductDto } from '../../../src/products/dto/filter-product.dto';
import { buildMockProduct } from '../../fixtures';

function mockQueryBuilder(overrides: Partial<jest.Mocked<SelectQueryBuilder<Product>>> = {}): jest.Mocked<SelectQueryBuilder<Product>> {
  const qb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getMany: jest.fn(),
    getCount: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<SelectQueryBuilder<Product>>;

  qb.leftJoinAndSelect.mockReturnValue(qb);
  qb.where.mockReturnValue(qb);
  qb.andWhere.mockReturnValue(qb);
  qb.addSelect.mockReturnValue(qb);
  qb.setParameter.mockReturnValue(qb);
  qb.orderBy.mockReturnValue(qb);
  qb.skip.mockReturnValue(qb);
  qb.take.mockReturnValue(qb);

  return qb;
}

describe('ProductsRepository', () => {
  let repository: ProductsRepository;
  let typeOrmRepo: jest.Mocked<Repository<Product>>;
  let qb: jest.Mocked<SelectQueryBuilder<Product>>;

  const mockProduct = buildMockProduct({ id: 1 });

  beforeEach(async () => {
    qb = mockQueryBuilder();

    typeOrmRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    } as unknown as jest.Mocked<Repository<Product>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsRepository,
        { provide: getRepositoryToken(Product), useValue: typeOrmRepo },
      ],
    }).compile();

    repository = module.get<ProductsRepository>(ProductsRepository);
  });

  describe('findById', () => {
    it('should return product when found', async () => {
      typeOrmRepo.findOne.mockResolvedValue(mockProduct);

      const result = await repository.findById(1);

      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
        relations: ['category', 'inventory'],
      });
      expect(result).toBe(mockProduct);
    });

    it('should return null when not found', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByIdOrFail', () => {
    it('should return product when found', async () => {
      typeOrmRepo.findOne.mockResolvedValue(mockProduct);

      const result = await repository.findByIdOrFail(1);

      expect(result).toBe(mockProduct);
    });

    it('should throw NotFoundException when not found', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);

      await expect(repository.findByIdOrFail(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySku', () => {
    it('should find product by SKU', async () => {
      typeOrmRepo.findOne.mockResolvedValue(mockProduct);

      const result = await repository.findBySku('SKU-TEST-001');

      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({ where: { sku: 'SKU-TEST-001' } });
      expect(result).toBe(mockProduct);
    });

    it('should return null when SKU not found', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.findBySku('SKU-NONEXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create and save a product', async () => {
      const data = { name: 'New Product', price: 19.99, categoryId: 1 };
      const created = Object.assign(new Product(), data);
      typeOrmRepo.create.mockReturnValue(created);
      typeOrmRepo.save.mockResolvedValue(created);

      const result = await repository.create(data);

      expect(typeOrmRepo.create).toHaveBeenCalledWith(data);
      expect(typeOrmRepo.save).toHaveBeenCalledWith(created);
      expect(result).toBe(created);
    });
  });

  describe('findAllPaginated', () => {
    it('should build query with default pagination', async () => {
      qb.getManyAndCount.mockResolvedValue([[mockProduct], 1]);

      const filterDto = new FilterProductDto();
      const result = await repository.findAllPaginated(filterDto);

      expect(typeOrmRepo.createQueryBuilder).toHaveBeenCalledWith('product');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledTimes(2);
      expect(qb.where).toHaveBeenCalledWith('product.isActive = :isActive', { isActive: true });
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should apply fulltext search for terms >= 3 chars', async () => {
      qb.getManyAndCount.mockResolvedValue([[mockProduct], 1]);

      const filterDto = new FilterProductDto();
      filterDto.search = 'mouse';
      await repository.findAllPaginated(filterDto);

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(product.name LIKE :search OR product.description LIKE :search OR product.sku LIKE :search)',
        { search: '%mouse%' },
      );
      expect(qb.addSelect).toHaveBeenCalledWith(
        'MATCH(product.name, product.description, product.sku) AGAINST(:relevance IN BOOLEAN MODE)',
        'relevance',
      );
      expect(qb.setParameter).toHaveBeenCalledWith('relevance', 'mouse*');
      expect(qb.orderBy).toHaveBeenCalledWith('relevance', 'DESC');
    });

    it('should fallback to LIKE for short search terms (< 3 chars)', async () => {
      qb.getManyAndCount.mockResolvedValue([[mockProduct], 1]);

      const filterDto = new FilterProductDto();
      filterDto.search = 'ab';
      await repository.findAllPaginated(filterDto);

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(product.name LIKE :search OR product.description LIKE :search OR product.sku LIKE :search)',
        { search: '%ab%' },
      );
      expect(qb.addSelect).not.toHaveBeenCalled();
    });

    it('should apply category filter', async () => {
      qb.getManyAndCount.mockResolvedValue([[mockProduct], 1]);

      const filterDto = new FilterProductDto();
      filterDto.categoryId = 2;
      await repository.findAllPaginated(filterDto);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'product.categoryId = :categoryId',
        { categoryId: 2 },
      );
    });

    it('should apply minPrice filter', async () => {
      qb.getManyAndCount.mockResolvedValue([[mockProduct], 1]);

      const filterDto = new FilterProductDto();
      filterDto.minPrice = 10;
      await repository.findAllPaginated(filterDto);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'product.price >= :minPrice',
        { minPrice: 10 },
      );
    });

    it('should apply maxPrice filter', async () => {
      qb.getManyAndCount.mockResolvedValue([[mockProduct], 1]);

      const filterDto = new FilterProductDto();
      filterDto.maxPrice = 100;
      await repository.findAllPaginated(filterDto);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'product.price <= :maxPrice',
        { maxPrice: 100 },
      );
    });

    it('should apply inStock filter', async () => {
      qb.getManyAndCount.mockResolvedValue([[mockProduct], 1]);

      const filterDto = new FilterProductDto();
      filterDto.inStock = true;
      await repository.findAllPaginated(filterDto);

      expect(qb.andWhere).toHaveBeenCalledWith('inventory.quantity > 0');
    });

    it('should sort by name ASC', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      const filterDto = new FilterProductDto();
      filterDto.sortBy = 'name';
      filterDto.sortOrder = 'ASC';
      await repository.findAllPaginated(filterDto);

      expect(qb.orderBy).toHaveBeenCalledWith('product.name', 'ASC');
    });

    it('should sort by price DESC', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      const filterDto = new FilterProductDto();
      filterDto.sortBy = 'price';
      filterDto.sortOrder = 'DESC';
      await repository.findAllPaginated(filterDto);

      expect(qb.orderBy).toHaveBeenCalledWith('product.price', 'DESC');
    });

    it('should sort by inventory.quantity when sortBy is stock', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      const filterDto = new FilterProductDto();
      filterDto.sortBy = 'stock';
      await repository.findAllPaginated(filterDto);

      expect(qb.orderBy).toHaveBeenCalledWith('inventory.quantity', 'DESC');
    });

    it('should fallback to createdAt for invalid sortBy', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      const filterDto = new FilterProductDto();
      filterDto.sortBy = 'invalid_field';
      await repository.findAllPaginated(filterDto);

      expect(qb.orderBy).toHaveBeenCalledWith('product.createdAt', 'DESC');
    });

    it('should respect custom page and limit', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      const filterDto = new FilterProductDto();
      filterDto.page = 3;
      filterDto.limit = 10;
      await repository.findAllPaginated(filterDto);

      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('should compute totalPages, hasNextPage, hasPrevPage', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      const filterDto = new FilterProductDto();
      const result = await repository.findAllPaginated(filterDto);

      expect(result.meta.totalPages).toBe(0);
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPrevPage).toBe(false);
    });
  });

  describe('softDelete', () => {
    it('should set isActive to false', async () => {
      typeOrmRepo.update.mockResolvedValue({ affected: 1 } as any);

      await repository.softDelete(1);

      expect(typeOrmRepo.update).toHaveBeenCalledWith(1, { isActive: false });
    });
  });

  describe('findByIds', () => {
    it('should return products for given ids', async () => {
      const product1 = buildMockProduct({ id: 1 });
      const product2 = buildMockProduct({ id: 2 });
      typeOrmRepo.find.mockResolvedValue([product1, product2]);

      const results = await repository.findByIds([1, 2]);

      expect(typeOrmRepo.find).toHaveBeenCalledWith({
        where: { id: expect.objectContaining({ _value: [1, 2] }) },
        relations: { inventory: true },
      });
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe(1);
      expect(results[1].id).toBe(2);
    });

    it('should return empty array for empty input', async () => {
      const results = await repository.findByIds([]);

      expect(typeOrmRepo.find).not.toHaveBeenCalled();
      expect(results).toEqual([]);
    });

    it('should return empty array when no products match', async () => {
      typeOrmRepo.find.mockResolvedValue([]);

      const results = await repository.findByIds([999, 998]);

      expect(results).toEqual([]);
    });
  });

  describe('countActive', () => {
    it('should count active products', async () => {
      typeOrmRepo.count.mockResolvedValue(5);

      const result = await repository.countActive();

      expect(typeOrmRepo.count).toHaveBeenCalledWith({ where: { isActive: true } });
      expect(result).toBe(5);
    });
  });
});
