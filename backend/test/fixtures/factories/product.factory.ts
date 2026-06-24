import { Product } from '../../../src/products/entities/product.entity';

export function buildMockProduct(overrides: Partial<Product> = {}): Product {
  const product = new Product();
  product.id = 1;
  product.name = 'Test Product';
  product.sku = 'SKU-TEST-001';
  product.description = 'A test product';
  product.price = 29.99;
  product.stock = 50;
  product.isActive = true;
  product.categoryId = 1;
  product.category = null as any;
  product.inventory = null as any;
  product.saleItems = [];
  product.createdAt = new Date();
  product.updatedAt = new Date();
  return Object.assign(product, overrides);
}
