import { Injectable } from '@nestjs/common';
import { SalesRepository } from '../sales/repositories/sales.repository';
import { SaleItemsRepository } from '../sales/repositories/sale-items.repository';
import { ProductsRepository } from '../products/repositories/products.repository';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly salesRepository: SalesRepository,
    private readonly saleItemsRepository: SaleItemsRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly inventoryService: InventoryService,
  ) {}

  async getSalesSummary(startDate?: string, endDate?: string) {
    return this.salesRepository.getSalesSummary(startDate, endDate);
  }

  async getTopProducts(limit = 10, startDate?: string, endDate?: string, page = 1) {
    return this.saleItemsRepository.findTopProducts(limit, startDate, endDate, page);
  }

  async getSalesByDay(startDate: string, endDate: string) {
    return this.salesRepository.getSalesByDay(startDate, endDate);
  }

  async getSalesByCategory(startDate?: string, endDate?: string, page = 1, limit = 50) {
    return this.saleItemsRepository.findSalesByCategory(startDate, endDate, page, limit);
  }

  async getStockReport(threshold = 10) {
    const [activeProducts, lowStock, outOfStock, stockDetails] = await Promise.all([
      this.productsRepository.countActive(),
      this.inventoryService.countLowStock(threshold),
      this.inventoryService.countOutOfStock(),
      this.inventoryService.getAllStock(),
    ]);

    return {
      summary: { totalProducts: activeProducts, lowStock, outOfStock },
      products: stockDetails,
    };
  }
}
