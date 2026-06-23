import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Sale, SaleStatus } from '../entities/sale.entity';

@Injectable()
export class SalesRepository {
  constructor(
    @InjectRepository(Sale)
    private readonly repo: Repository<Sale>,
  ) {}

  private getRepo(manager?: EntityManager): Repository<Sale> {
    return manager ? manager.getRepository(Sale) : this.repo;
  }

  async findById(id: number, manager?: EntityManager): Promise<Sale | null> {
    return this.getRepo(manager).findOne({
      where: { id },
      relations: ['items', 'items.product', 'items.product.category', 'user'],
    });
  }

  async create(data: Partial<Sale>, manager?: EntityManager): Promise<Sale> {
    const repo = this.getRepo(manager);
    const entity = repo.create(data);
    return repo.save(entity);
  }

  async save(sale: Sale, manager?: EntityManager): Promise<Sale> {
    return this.getRepo(manager).save(sale);
  }

  async findAllPaginated(
    page: number,
    limit: number,
    startDate?: string,
    endDate?: string,
    status?: SaleStatus,
    manager?: EntityManager,
  ) {
    const repo = this.getRepo(manager);
    const query = repo
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('sale.user', 'user')
      .orderBy('sale.createdAt', 'DESC');

    if (startDate) {
      query.andWhere('sale.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      query.andWhere('sale.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });
    }
    if (status) {
      query.andWhere('sale.status = :status', { status });
    }

    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const [sales, total] = await query.getManyAndCount();

    return {
      data: sales,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async count(manager?: EntityManager): Promise<number> {
    return this.getRepo(manager).count();
  }

  async getSalesSummary(startDate?: string, endDate?: string, manager?: EntityManager) {
    const repo = this.getRepo(manager);
    const query = repo
      .createQueryBuilder('sale')
      .select('COUNT(sale.id)', 'totalTransactions')
      .addSelect('SUM(sale.total)', 'totalRevenue')
      .addSelect('AVG(sale.total)', 'averageSale')
      .addSelect('SUM(sale.discountAmount)', 'totalDiscount')
      .where('sale.status = :status', { status: SaleStatus.COMPLETED });

    if (startDate) query.andWhere('sale.createdAt >= :startDate', { startDate });
    if (endDate) query.andWhere('sale.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });

    return query.getRawOne();
  }

  async getSalesByDay(startDate: string, endDate: string, manager?: EntityManager) {
    const repo = this.getRepo(manager);
    return repo
      .createQueryBuilder('sale')
      .select('DATE(sale.createdAt)', 'date')
      .addSelect('COUNT(sale.id)', 'transactions')
      .addSelect('SUM(sale.total)', 'revenue')
      .where('sale.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate: `${endDate} 23:59:59`,
      })
      .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
      .groupBy('DATE(sale.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();
  }
}
