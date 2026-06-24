import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { Sale, SaleStatus, PaymentMethod } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { SalesRepository } from './repositories/sales.repository';
import { SaleItemsRepository } from './repositories/sale-items.repository';
import { ProductsRepository } from '../products/repositories/products.repository';
import { InventoryService } from '../inventory/inventory.service';
import { InventoryGateway } from '../inventory/inventory.gateway';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SalesQueryDto } from './dto/sales-query.dto';
import { AuditLogService } from '../common/services/audit-log.service';
import { AuditEvent } from '../common/audit/audit-event.enum';

@Injectable()
export class SalesService {
  private readonly VALID_TRANSITIONS: Record<SaleStatus, SaleStatus[]> = {
    [SaleStatus.PENDING]: [SaleStatus.COMPLETED, SaleStatus.CANCELLED],
    [SaleStatus.COMPLETED]: [SaleStatus.REFUNDED],
    [SaleStatus.CANCELLED]: [],
    [SaleStatus.REFUNDED]: [],
  };

  constructor(
    private readonly salesRepository: SalesRepository,
    private readonly saleItemsRepository: SaleItemsRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly inventoryService: InventoryService,
    private readonly dataSource: DataSource,
    private readonly inventoryGateway: InventoryGateway,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(createSaleDto: CreateSaleDto, userId: number): Promise<Sale> {
    const { items, discountPercent = 0, notes, paymentMethod } = createSaleDto;

    const quantityMap = new Map<number, number>();
    for (const item of items) {
      quantityMap.set(item.productId, (quantityMap.get(item.productId) ?? 0) + item.quantity);
    }
    const aggregatedItems = Array.from(quantityMap, ([productId, quantity]) => ({ productId, quantity }));
    const productIds = aggregatedItems.map((i) => i.productId);

    const sale = await this.dataSource.transaction(async (manager) => {
      const products = await this.productsRepository.findByIds(productIds, manager);

      if (products.length !== productIds.length) {
        throw new NotFoundException('One or more products not found');
      }

      const productMap = new Map(products.map((p) => [p.id, p]));

      const saleItems: Partial<SaleItem>[] = [];
      let subtotal = 0;

      for (const item of aggregatedItems) {
        const product = productMap.get(item.productId)!;
        const availableStock = product.inventory?.quantity ?? 0;

        if (!product.isActive) {
          throw new BadRequestException(`Product "${product.name}" is no longer available`);
        }

        if (availableStock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${product.name}". Available: ${availableStock}, Requested: ${item.quantity}`,
          );
        }

        const itemSubtotal = Number(product.price) * item.quantity;
        subtotal += itemSubtotal;

        saleItems.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: Number(product.price),
          subtotal: itemSubtotal,
        });
      }

      const discountAmount = (subtotal * discountPercent) / 100;
      const total = subtotal - discountAmount;

      const invoiceNumber = this.generateInvoiceNumber();

      const created = await this.salesRepository.create({
        invoiceNumber,
        subtotal,
        discountPercent,
        discountAmount,
        total,
        paymentMethod: paymentMethod ?? PaymentMethod.CASH,
        notes,
        userId,
        items: saleItems as SaleItem[],
      }, manager);

      for (const item of aggregatedItems) {
        await this.inventoryService.decreaseStock(item.productId, item.quantity, manager);
      }

      return created;
    });

    const updatedProducts = await this.productsRepository.findByIds(productIds);
    for (const product of updatedProducts) {
      this.inventoryGateway.emitStockUpdate(product.id, product.inventory?.quantity ?? 0);
    }

    this.auditLogService.log(AuditEvent.SALE_CREATED, { userId });
    return sale;
  }

  async findAll(query: SalesQueryDto) {
    return this.salesRepository.findAllPaginated(
      query.page ?? 1,
      query.limit ?? 20,
      query.startDate,
      query.endDate,
      query.status,
    );
  }

  async findOne(id: number): Promise<Sale> {
    const sale = await this.salesRepository.findById(id);
    if (!sale) {
      throw new NotFoundException(`Sale #${id} not found`);
    }
    return sale;
  }

  async updateStatus(id: number, newStatus: SaleStatus, userId?: number): Promise<Sale> {
    const sale = await this.findOne(id);

    const allowed = this.VALID_TRANSITIONS[sale.status];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${sale.status} to ${newStatus}`,
      );
    }

    const updated = await this.dataSource.transaction(async (manager) => {
      if (newStatus === SaleStatus.REFUNDED) {
        const fullSale = await this.salesRepository.findById(sale.id, manager);
        if (fullSale) {
          for (const item of fullSale.items) {
            await this.inventoryService.increaseStock(item.productId, item.quantity, manager);
          }
        }
      }

      sale.status = newStatus;
      return this.salesRepository.save(sale, manager);
    });

    const eventMap: Record<SaleStatus, AuditEvent> = {
      [SaleStatus.COMPLETED]: AuditEvent.SALE_COMPLETED,
      [SaleStatus.CANCELLED]: AuditEvent.SALE_CANCELLED,
      [SaleStatus.REFUNDED]: AuditEvent.SALE_REFUNDED,
      [SaleStatus.PENDING]: AuditEvent.SALE_CREATED,
    };
    this.auditLogService.log(eventMap[newStatus] ?? AuditEvent.SALE_CREATED, { userId });
    return updated;
  }

  async getInvoice(id: number) {
    const sale = await this.findOne(id);

    return {
      invoiceNumber: sale.invoiceNumber,
      date: sale.createdAt,
      cashier: {
        name: sale.user.name,
        email: sale.user.email,
      },
      items: sale.items.map((item) => ({
        product: item.product.name,
        sku: item.product.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      })),
      subtotal: sale.subtotal,
      discountPercent: Number(sale.discountPercent),
      discountAmount: Number(sale.discountAmount),
      total: Number(sale.total),
      notes: sale.notes,
    };
  }

  private generateInvoiceNumber(): string {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomUUID().split('-').slice(0, 2).join('').toUpperCase();
    return `INV-${year}-${timestamp}-${random}`;
  }
}
