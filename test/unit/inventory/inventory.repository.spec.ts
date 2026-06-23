import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { InventoryRepository } from '../../../src/inventory/inventory.repository';
import { Inventory } from '../../../src/inventory/inventory.entity';
import { buildMockInventory } from '../../fixtures';

function mockQueryBuilder(overrides: Partial<jest.Mocked<SelectQueryBuilder<Inventory>>> = {}): jest.Mocked<SelectQueryBuilder<Inventory>> {
  const qb = {
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getMany: jest.fn(),
    getCount: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<SelectQueryBuilder<Inventory>>;

  qb.leftJoin.mockReturnValue(qb);
  qb.leftJoinAndSelect.mockReturnValue(qb);
  qb.where.mockReturnValue(qb);
  qb.andWhere.mockReturnValue(qb);
  qb.orderBy.mockReturnValue(qb);
  qb.skip.mockReturnValue(qb);
  qb.take.mockReturnValue(qb);

  return qb;
}

describe('InventoryRepository', () => {
  let repository: InventoryRepository;
  let typeOrmRepo: jest.Mocked<Repository<Inventory>>;
  let qb: jest.Mocked<SelectQueryBuilder<Inventory>>;

  const mockInventory = buildMockInventory({ id: 1, productId: 1 });

  beforeEach(async () => {
    qb = mockQueryBuilder();

    typeOrmRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      decrement: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    } as unknown as jest.Mocked<Repository<Inventory>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryRepository,
        { provide: getRepositoryToken(Inventory), useValue: typeOrmRepo },
      ],
    }).compile();

    repository = module.get<InventoryRepository>(InventoryRepository);
  });

  describe('findByProductId', () => {
    it('should find by productId', async () => {
      typeOrmRepo.findOne.mockResolvedValue(mockInventory);

      const result = await repository.findByProductId(1);

      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({ where: { productId: 1 } });
      expect(result).toBe(mockInventory);
    });

    it('should return null when not found', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.findByProductId(999);

      expect(result).toBeNull();
    });
  });

  describe('findByProductIdWithLock', () => {
    it('should find with pessimistic lock', async () => {
      const mockManager = {
        getRepository: jest.fn().mockReturnValue(typeOrmRepo),
      } as any;
      typeOrmRepo.findOne.mockResolvedValue(mockInventory);

      const result = await repository.findByProductIdWithLock(1, mockManager);

      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { productId: 1 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(result).toBe(mockInventory);
    });
  });

  describe('save', () => {
    it('should save inventory', async () => {
      typeOrmRepo.save.mockResolvedValue(mockInventory);

      const result = await repository.save(mockInventory);

      expect(typeOrmRepo.save).toHaveBeenCalledWith(mockInventory);
      expect(result).toBe(mockInventory);
    });
  });

  describe('create', () => {
    it('should create and save inventory', async () => {
      const data = { productId: 1, quantity: 100 };
      typeOrmRepo.save.mockResolvedValue(mockInventory);

      const result = await repository.create(data);

      expect(typeOrmRepo.save).toHaveBeenCalledWith(data);
      expect(result).toBe(mockInventory);
    });
  });

  describe('decrement', () => {
    it('should decrement quantity', async () => {
      await repository.decrement(1, 5);

      expect(typeOrmRepo.decrement).toHaveBeenCalledWith({ id: 1 }, 'quantity', 5);
    });
  });

  describe('countLowStock', () => {
    it('should build query with default threshold', async () => {
      qb.getCount.mockResolvedValue(3);

      const result = await repository.countLowStock();

      expect(typeOrmRepo.createQueryBuilder).toHaveBeenCalledWith('inv');
      expect(qb.leftJoin).toHaveBeenCalledWith('inv.product', 'product');
      expect(qb.where).toHaveBeenCalledWith('product.isActive = true');
      expect(qb.andWhere).toHaveBeenCalledWith('inv.quantity > 0');
      expect(qb.andWhere).toHaveBeenCalledWith('inv.quantity <= :threshold', { threshold: 10 });
      expect(result).toBe(3);
    });

    it('should respect custom threshold', async () => {
      qb.getCount.mockResolvedValue(5);

      const result = await repository.countLowStock(25);

      expect(qb.andWhere).toHaveBeenCalledWith('inv.quantity <= :threshold', { threshold: 25 });
      expect(result).toBe(5);
    });
  });

  describe('countOutOfStock', () => {
    it('should build query', async () => {
      qb.getCount.mockResolvedValue(2);

      const result = await repository.countOutOfStock();

      expect(typeOrmRepo.createQueryBuilder).toHaveBeenCalledWith('inv');
      expect(qb.where).toHaveBeenCalledWith('product.isActive = true');
      expect(qb.andWhere).toHaveBeenCalledWith('inv.quantity = 0');
      expect(result).toBe(2);
    });
  });

  describe('countTotalProducts', () => {
    it('should count active products', async () => {
      qb.getCount.mockResolvedValue(100);

      const result = await repository.countTotalProducts();

      expect(typeOrmRepo.createQueryBuilder).toHaveBeenCalledWith('inv');
      expect(qb.leftJoin).toHaveBeenCalledWith('inv.product', 'product');
      expect(qb.where).toHaveBeenCalledWith('product.isActive = true');
      expect(result).toBe(100);
    });
  });

  describe('findAllWithStock', () => {
    it('should return paginated results with default pagination', async () => {
      const items = [mockInventory];
      qb.getMany.mockResolvedValue(items);

      const result = await repository.findAllWithStock();

      expect(typeOrmRepo.createQueryBuilder).toHaveBeenCalledWith('inv');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('inv.product', 'product');
      expect(qb.orderBy).toHaveBeenCalledWith('inv.quantity', 'ASC');
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(50);
      expect(result).toEqual(items);
    });

    it('should respect custom page and limit', async () => {
      qb.getMany.mockResolvedValue([]);

      await repository.findAllWithStock(3, 25);

      expect(qb.skip).toHaveBeenCalledWith(50);
      expect(qb.take).toHaveBeenCalledWith(25);
    });
  });

  describe('findLowStock', () => {
    it('should return low stock items', async () => {
      const items = [mockInventory];
      qb.getMany.mockResolvedValue(items);

      const result = await repository.findLowStock(10);

      expect(typeOrmRepo.createQueryBuilder).toHaveBeenCalledWith('inv');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('inv.product', 'product');
      expect(qb.andWhere).toHaveBeenCalledWith('inv.quantity <= :threshold', { threshold: 10 });
      expect(qb.andWhere).toHaveBeenCalledWith('inv.quantity > 0');
      expect(result).toEqual(items);
    });

    it('should use default threshold', async () => {
      qb.getMany.mockResolvedValue([]);

      await repository.findLowStock();

      expect(qb.andWhere).toHaveBeenCalledWith('inv.quantity <= :threshold', { threshold: 10 });
    });
  });
});
