import { Inventory } from '../../../src/inventory/entities/inventory.entity';

export function buildMockInventory(overrides: Partial<Inventory> = {}): Inventory {
  const inventory = new Inventory();
  inventory.id = 1;
  inventory.productId = 1;
  inventory.quantity = 50;
  inventory.minimumStock = 10;
  inventory.product = null as any;
  inventory.createdAt = new Date();
  inventory.updatedAt = new Date();
  return Object.assign(inventory, overrides);
}
