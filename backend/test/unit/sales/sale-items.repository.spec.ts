import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { SaleItemsRepository } from '../../../src/sales/repositories/sale-items.repository';
import { SaleItem } from '../../../src/sales/entities/sale-item.entity';
import { SaleStatus } from '../../../src/sales/entities/sale.entity';

describe('SaleItemsRepository', () => {
  let repository: SaleItemsRepository;
  let typeOrmRepo: jest.Mocked<Repository<SaleItem>>;

  beforeEach(async () => {
    typeOrmRepo = {
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<SaleItem>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaleItemsRepository,
        { provide: getRepositoryToken(SaleItem), useValue: typeOrmRepo },
      ],
    }).compile();

    repository = module.get<SaleItemsRepository>(SaleItemsRepository);
  });

  describe('findTopProducts', () => {
    it('should filter by SaleStatus.COMPLETED only', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      typeOrmRepo.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await repository.findTopProducts();

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'sale.status = :status',
        { status: SaleStatus.COMPLETED },
      );
    });

    it('should not include other status sales', async () => {
      const completedRow = { productId: 1, productName: 'A', totalSold: '10', totalRevenue: '500' };
      const cancelledRow = { productId: 2, productName: 'B', totalSold: '5', totalRevenue: '200' };

      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockImplementation(function (clause: string) {
          // Simulate COMPLETED filter — only return completed sales
          if (clause.includes('sale.status')) {
            this._filtered = true;
          }
          return this;
        }),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockImplementation(function () {
          return this._filtered ? [completedRow] : [completedRow, cancelledRow];
        }),
      };

      typeOrmRepo.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await repository.findTopProducts();

      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe(1);
    });
  });

  describe('findSalesByCategory', () => {
    it('should filter by SaleStatus.COMPLETED only', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      typeOrmRepo.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await repository.findSalesByCategory();

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'sale.status = :status',
        { status: SaleStatus.COMPLETED },
      );
    });

    it('should respect date filters alongside status filter', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      typeOrmRepo.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await repository.findSalesByCategory('2024-01-01', '2024-12-31');

      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(3);
    });
  });
});
