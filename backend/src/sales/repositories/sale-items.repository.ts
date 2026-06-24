import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { SaleItem } from '../entities/sale-item.entity';
import { SaleStatus } from '../entities/sale.entity';

@Injectable()
export class SaleItemsRepository {
  constructor(
    @InjectRepository(SaleItem)
    private readonly repo: Repository<SaleItem>,
  ) {}

  private getRepo(manager?: EntityManager): Repository<SaleItem> {
    return manager ? manager.getRepository(SaleItem) : this.repo;
  }

  async findTopProducts(
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    page: number = 1,
    manager?: EntityManager,
  ) {
    const repo = this.getRepo(manager);
    const skip = (page - 1) * limit;
    const query = repo
      .createQueryBuilder('item')
      .select('item.productId', 'productId')
      .addSelect('product.name', 'productName')
      .addSelect('SUM(item.quantity)', 'totalSold')
      .addSelect('SUM(item.subtotal)', 'totalRevenue')
      .leftJoin('item.product', 'product')
      .leftJoin('item.sale', 'sale')
      .groupBy('item.productId')
      .addGroupBy('product.name')
      .orderBy('totalSold', 'DESC')
      .skip(skip)
      .take(limit);

    if (startDate) query.andWhere('sale.createdAt >= :startDate', { startDate });
    if (endDate) query.andWhere('sale.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });
    query.andWhere('sale.status = :status', { status: SaleStatus.COMPLETED });

    return query.getRawMany();
  }

  async findSalesByCategory(
    startDate?: string,
    endDate?: string,
    page: number = 1,
    limit: number = 50,
    manager?: EntityManager,
  ) {
    const repo = this.getRepo(manager);
    const skip = (page - 1) * limit;
    const query = repo
      .createQueryBuilder('item')
      .select('category.name', 'categoryName')
      .addSelect('SUM(item.quantity)', 'totalSold')
      .addSelect('SUM(item.subtotal)', 'totalRevenue')
      .leftJoin('item.product', 'product')
      .leftJoin('product.category', 'category')
      .leftJoin('item.sale', 'sale')
      .groupBy('category.id')
      .addGroupBy('category.name')
      .orderBy('totalRevenue', 'DESC')
      .skip(skip)
      .take(limit);

    if (startDate) query.andWhere('sale.createdAt >= :startDate', { startDate });
    if (endDate) query.andWhere('sale.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });
    query.andWhere('sale.status = :status', { status: SaleStatus.COMPLETED });

    return query.getRawMany();
  }
}
