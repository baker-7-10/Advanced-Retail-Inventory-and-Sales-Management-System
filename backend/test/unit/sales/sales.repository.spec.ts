import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { SalesRepository } from '../../../src/sales/repositories/sales.repository';
import { Sale, SaleStatus } from '../../../src/sales/entities/sale.entity';

describe('SalesRepository', () => {
  let repository: SalesRepository;
  let typeOrmRepo: jest.Mocked<Repository<Sale>>;

  const mockSale = {
    id: 1,
    invoiceNumber: 'INV-2026-TEST',
    subtotal: 400,
    discountPercent: 10,
    discountAmount: 40,
    total: 360,
    notes: null,
    status: SaleStatus.COMPLETED,
    userId: 1,
    items: [],
    createdAt: new Date(),
  } as Sale;

  beforeEach(async () => {
    typeOrmRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<Sale>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesRepository,
        { provide: getRepositoryToken(Sale), useValue: typeOrmRepo },
      ],
    }).compile();

    repository = module.get<SalesRepository>(SalesRepository);
  });

  describe('findById', () => {
    it('should find a sale by id with relations', async () => {
      typeOrmRepo.findOne.mockResolvedValue(mockSale);

      const result = await repository.findById(1);

      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['items', 'items.product', 'items.product.category', 'user'],
      });
      expect(result).toEqual(mockSale);
    });

    it('should return null when not found', async () => {
      typeOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create and save a sale entity', async () => {
      const data: Partial<Sale> = { invoiceNumber: 'INV-2026-TEST', subtotal: 100, total: 100, userId: 1 };
      const entity = typeOrmRepo.create.mockReturnValue(data as Sale);
      typeOrmRepo.save.mockResolvedValue(mockSale);

      const result = await repository.create(data);

      expect(typeOrmRepo.create).toHaveBeenCalledWith(data);
      expect(typeOrmRepo.save).toHaveBeenCalled();
      expect(result).toEqual(mockSale);
    });

    it('should use provided manager', async () => {
      const managerRepo = {
        create: jest.fn().mockReturnValue(mockSale),
        save: jest.fn().mockResolvedValue(mockSale),
      };
      const manager = { getRepository: () => managerRepo } as unknown as EntityManager;

      await repository.create({ invoiceNumber: 'INV-TEST', subtotal: 100, total: 100, userId: 1 }, manager);

      expect(managerRepo.create).toHaveBeenCalled();
    });
  });

  describe('count', () => {
    it('should return total count', async () => {
      typeOrmRepo.count.mockResolvedValue(42);

      const result = await repository.count();

      expect(result).toBe(42);
    });
  });

  describe('findAllPaginated', () => {
    it('should return paginated results', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockSale], 1]),
      };

      typeOrmRepo.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await repository.findAllPaginated(1, 20);

      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledTimes(3);
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('sale.createdAt', 'DESC');
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(result).toEqual({ data: [mockSale], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } });
    });

    it('should filter by status', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockSale], 1]),
      };

      typeOrmRepo.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await repository.findAllPaginated(1, 20, undefined, undefined, SaleStatus.COMPLETED);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('sale.status = :status', { status: SaleStatus.COMPLETED });
    });
  });

  describe('getSalesSummary', () => {
    it('should return aggregated summary', async () => {
      const rawResult = { totalTransactions: '10', totalRevenue: '5000', averageSale: '500', totalDiscount: '200' };
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(rawResult),
      };

      typeOrmRepo.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await repository.getSalesSummary('2024-01-01', '2024-12-31');

      expect(queryBuilder.where).toHaveBeenCalledWith('sale.status = :status', { status: SaleStatus.COMPLETED });
      expect(queryBuilder.getRawOne).toHaveBeenCalled();
      expect(result).toEqual(rawResult);
    });
  });

  describe('getSalesByDay', () => {
    it('should return daily aggregation', async () => {
      const rawResult = [{ date: '2024-01-15', transactions: '5', revenue: '2500' }];
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(rawResult),
      };

      typeOrmRepo.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await repository.getSalesByDay('2024-01-01', '2024-01-31');

      expect(queryBuilder.getRawMany).toHaveBeenCalled();
      expect(result).toEqual(rawResult);
    });
  });
});
