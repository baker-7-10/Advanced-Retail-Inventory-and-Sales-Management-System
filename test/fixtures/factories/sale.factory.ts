import { Sale, SaleStatus } from '../../../src/sales/entities/sale.entity';
import { Product } from '../../../src/products/entities/product.entity';

export function buildMockSale(overrides: Partial<Sale> = {}): Sale {
  const sale = {
    id: 1,
    invoiceNumber: 'INV-2026-A1B2C3',
    subtotal: 300,
    discountPercent: 10,
    discountAmount: 30,
    total: 270,
    notes: null,
    status: SaleStatus.COMPLETED,
    userId: 1,
    items: [],
    createdAt: new Date(),
  } as Sale;
  return Object.assign(sale, overrides);
}

export function buildMockProductForSale(overrides: Partial<Product> = {}): Product {
  const mockInventory = {
    id: 1,
    productId: 1,
    quantity: 10,
    minimumStock: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const product = {
    id: 1,
    name: 'Product A',
    price: 100,
    stock: 10,
    isActive: true,
    sku: 'A001',
    description: 'Description A',
    categoryId: 1,
    category: null,
    saleItems: [],
    inventory: { ...mockInventory, productId: 1, quantity: 10 },
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Product;
  return Object.assign(product, overrides);
}
