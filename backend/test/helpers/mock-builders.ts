import { ProductsService } from '../../src/products/products.service';
import { ProductsRepository } from '../../src/products/repositories/products.repository';
import { InventoryService } from '../../src/inventory/inventory.service';
import { SalesService } from '../../src/sales/sales.service';
import { SalesRepository } from '../../src/sales/repositories/sales.repository';
import { CategoriesService } from '../../src/categories/categories.service';
import { CategoriesRepository } from '../../src/categories/repositories/categories.repository';
import { UsersService } from '../../src/users/users.service';
import { UsersRepository } from '../../src/users/repositories/users.repository';
import { InventoryRepository } from '../../src/inventory/repositories/inventory.repository';
import { DataSource } from 'typeorm';

export function buildMockProductsService(): jest.Mocked<ProductsService> {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    updateStock: jest.fn(),
    getLowStockProducts: jest.fn(),
  } as unknown as jest.Mocked<ProductsService>;
}

export function buildMockInventoryService(): jest.Mocked<InventoryService> {
  return {
    findByProductId: jest.fn(),
    findOrCreate: jest.fn(),
    decreaseStock: jest.fn(),
    updateQuantity: jest.fn(),
    updateMinimumStock: jest.fn(),
    countLowStock: jest.fn(),
    countOutOfStock: jest.fn(),
    countTotalProducts: jest.fn(),
    getStats: jest.fn(),
    getLowStockProducts: jest.fn(),
    getAllStock: jest.fn(),
  } as unknown as jest.Mocked<InventoryService>;
}

export function buildMockSalesService(): jest.Mocked<SalesService> {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    updateStatus: jest.fn(),
    getInvoice: jest.fn(),
  } as unknown as jest.Mocked<SalesService>;
}

export function buildMockCategoriesService(): jest.Mocked<CategoriesService> {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
  } as unknown as jest.Mocked<CategoriesService>;
}

export function buildMockUsersService(): jest.Mocked<UsersService> {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    toggleActive: jest.fn(),
  } as unknown as jest.Mocked<UsersService>;
}

export function buildMockDataSource(): jest.Mocked<DataSource> {
  return {
    transaction: jest.fn(),
    getRepository: jest.fn(),
  } as unknown as jest.Mocked<DataSource>;
}
