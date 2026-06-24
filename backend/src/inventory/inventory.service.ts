import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { InventoryRepository } from './inventory.repository';
import { AuditLogService } from '../common/services/audit-log.service';
import { AuditEvent } from '../common/audit/audit-event.enum';

@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findByProductId(productId: number, manager?: EntityManager) {
    const inventory = await this.inventoryRepository.findByProductId(productId, manager);
    if (!inventory) {
      throw new NotFoundException(`Inventory not found for product ${productId}`);
    }
    return inventory;
  }

  async findOrCreate(productId: number, quantity: number = 0, manager?: EntityManager) {
    let inventory = await this.inventoryRepository.findByProductId(productId, manager);
    if (!inventory) {
      inventory = await this.inventoryRepository.create({ productId, quantity }, manager);
    }
    return inventory;
  }

  async increaseStock(productId: number, quantity: number, manager: EntityManager): Promise<void> {
    const inventory = await this.inventoryRepository.findByProductIdWithLock(productId, manager);
    if (!inventory) {
      throw new NotFoundException(`Inventory not found for product ${productId}`);
    }
    await this.inventoryRepository.increment(inventory.id, quantity, manager);
  }

  async decreaseStock(productId: number, quantity: number, manager: EntityManager): Promise<void> {
    const inventory = await this.inventoryRepository.findByProductIdWithLock(productId, manager);
    if (!inventory) {
      throw new NotFoundException(`Inventory not found for product ${productId}`);
    }

    if (inventory.quantity < quantity) {
      throw new BadRequestException(
        `Insufficient stock for product ${productId}. Available: ${inventory.quantity}, Requested: ${quantity}`,
      );
    }

    await this.inventoryRepository.decrement(inventory.id, quantity, manager);
  }

  async updateQuantity(productId: number, quantity: number, manager?: EntityManager, userId?: number): Promise<void> {
    const inventory = await this.inventoryRepository.findByProductId(productId, manager);
    if (!inventory) {
      throw new NotFoundException(`Inventory not found for product ${productId}`);
    }
    inventory.quantity = quantity;
    await this.inventoryRepository.save(inventory, manager);
    this.auditLogService.log(AuditEvent.INVENTORY_UPDATED, { userId, productId });
  }

  async updateMinimumStock(productId: number, minimumStock: number, userId?: number): Promise<void> {
    const inventory = await this.inventoryRepository.findByProductId(productId);
    if (!inventory) {
      throw new NotFoundException(`Inventory not found for product ${productId}`);
    }
    inventory.minimumStock = minimumStock;
    await this.inventoryRepository.save(inventory);
    this.auditLogService.log(AuditEvent.INVENTORY_UPDATED, { userId, productId });
  }

  async countLowStock(threshold: number = 10): Promise<number> {
    return this.inventoryRepository.countLowStock(threshold);
  }

  async countOutOfStock(): Promise<number> {
    return this.inventoryRepository.countOutOfStock();
  }

  async countTotalProducts(): Promise<number> {
    return this.inventoryRepository.countTotalProducts();
  }

  async getStats() {
    const [totalProducts, lowStockProducts, outOfStockProducts] = await Promise.all([
      this.inventoryRepository.countTotalProducts(),
      this.inventoryRepository.countLowStock(),
      this.inventoryRepository.countOutOfStock(),
    ]);
    return { totalProducts, lowStockProducts, outOfStockProducts };
  }

  async getLowStockProducts(threshold: number = 10, page: number = 1, limit: number = 50) {
    return this.inventoryRepository.findLowStock(threshold, page, limit);
  }

  async getAllStock(page: number = 1, limit: number = 50) {
    return this.inventoryRepository.findAllWithStock(page, limit);
  }
}
