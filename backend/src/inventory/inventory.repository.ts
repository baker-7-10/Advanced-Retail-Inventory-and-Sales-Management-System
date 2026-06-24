import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Inventory } from './inventory.entity';

@Injectable()
export class InventoryRepository {
  constructor(
    @InjectRepository(Inventory)
    private readonly repo: Repository<Inventory>,
  ) {}

  private getRepo(manager?: EntityManager): Repository<Inventory> {
    return manager ? manager.getRepository(Inventory) : this.repo;
  }

  async findByProductId(productId: number, manager?: EntityManager): Promise<Inventory | null> {
    return this.getRepo(manager).findOne({ where: { productId } });
  }

  async findByProductIdWithLock(productId: number, manager: EntityManager): Promise<Inventory | null> {
    return this.getRepo(manager).findOne({
      where: { productId },
      lock: { mode: 'pessimistic_write' },
    });
  }

  async save(inventory: Inventory, manager?: EntityManager): Promise<Inventory> {
    return this.getRepo(manager).save(inventory);
  }

  async create(data: Partial<Inventory>, manager?: EntityManager): Promise<Inventory> {
    return this.getRepo(manager).save(data);
  }

  async decrement(id: number, quantity: number, manager?: EntityManager): Promise<void> {
    await this.getRepo(manager).decrement({ id }, 'quantity', quantity);
  }

  async increment(id: number, quantity: number, manager?: EntityManager): Promise<void> {
    await this.getRepo(manager).increment({ id }, 'quantity', quantity);
  }

  async countLowStock(threshold: number = 10, manager?: EntityManager): Promise<number> {
    return this.getRepo(manager)
      .createQueryBuilder('inv')
      .leftJoin('inv.product', 'product')
      .where('product.isActive = true')
      .andWhere('inv.quantity > 0')
      .andWhere('inv.quantity <= :threshold', { threshold })
      .getCount();
  }

  async countOutOfStock(manager?: EntityManager): Promise<number> {
    return this.getRepo(manager)
      .createQueryBuilder('inv')
      .leftJoin('inv.product', 'product')
      .where('product.isActive = true')
      .andWhere('inv.quantity = 0')
      .getCount();
  }

  async countTotalProducts(manager?: EntityManager): Promise<number> {
    return this.getRepo(manager)
      .createQueryBuilder('inv')
      .leftJoin('inv.product', 'product')
      .where('product.isActive = true')
      .getCount();
  }

  async findAllWithStock(page: number = 1, limit: number = 50, manager?: EntityManager) {
    const skip = (page - 1) * limit;
    return this.getRepo(manager)
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.product', 'product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.isActive = true')
      .orderBy('inv.quantity', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();
  }

  async findLowStock(threshold: number = 10, page: number = 1, limit: number = 50, manager?: EntityManager) {
    const skip = (page - 1) * limit;
    return this.getRepo(manager)
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.product', 'product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.isActive = true')
      .andWhere('inv.quantity <= :threshold', { threshold })
      .andWhere('inv.quantity > 0')
      .orderBy('inv.quantity', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();
  }
}
