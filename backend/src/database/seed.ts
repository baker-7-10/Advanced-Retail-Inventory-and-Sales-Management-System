import * as bcrypt from 'bcryptjs';
import dataSource from './data-source';
import { User, UserRole } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { Product } from '../products/entities/product.entity';
import { Inventory } from '../inventory/inventory.entity';

async function seed() {
  const ds = await dataSource.initialize();
  const queryRunner = ds.createQueryRunner();

  try {
    await queryRunner.startTransaction();

    const userRepo = queryRunner.manager.getRepository(User);
    const categoryRepo = queryRunner.manager.getRepository(Category);
    const productRepo = queryRunner.manager.getRepository(Product);
    const inventoryRepo = queryRunner.manager.getRepository(Inventory);

    const existingAdmin = await userRepo.findOne({ where: { email: 'admin@retail.com' } });
    if (existingAdmin) {
      console.log('Seed data already exists, skipping.');
      return;
    }

    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    const admin = userRepo.create({
      name: 'Admin User',
      email: 'admin@retail.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
      isActive: true,
    });
    await userRepo.save(admin);
    console.log('Created admin user');

    const managerUser = userRepo.create({
      name: 'Store Manager',
      email: 'manager@retail.com',
      password: hashedPassword,
      role: UserRole.MANAGER,
      isActive: true,
    });
    await userRepo.save(managerUser);
    console.log('Created manager user');

    const employeeUser = userRepo.create({
      name: 'Cashier Employee',
      email: 'employee@retail.com',
      password: hashedPassword,
      role: UserRole.EMPLOYEE,
      isActive: true,
    });
    await userRepo.save(employeeUser);
    console.log('Created employee user');

    const categories = [
      { name: 'Electronics', description: 'Electronic devices and accessories' },
      { name: 'Clothing', description: 'Apparel and fashion items' },
      { name: 'Food & Beverages', description: 'Food products and drinks' },
      { name: 'Home & Garden', description: 'Home improvement and garden supplies' },
      { name: 'Sports & Outdoors', description: 'Sports equipment and outdoor gear' },
    ];

    const savedCategories: Category[] = [];
    for (const cat of categories) {
      const category = categoryRepo.create(cat);
      await categoryRepo.save(category);
      savedCategories.push(category);
      console.log(`Created category: ${cat.name}`);
    }

    const products = [
      { name: 'Wireless Headphones', description: 'Bluetooth 5.0 noise-cancelling headphones', price: 79.99, sku: 'WH-1000', categoryIndex: 0, stock: 50 },
      { name: 'Smart Watch', description: 'Fitness tracker with heart rate monitor', price: 199.99, sku: 'SW-200', categoryIndex: 0, stock: 30 },
      { name: 'USB-C Hub', description: '7-in-1 multiport adapter', price: 34.99, sku: 'UC-300', categoryIndex: 0, stock: 100 },
      { name: 'Cotton T-Shirt', description: 'Premium cotton crew neck tee', price: 19.99, sku: 'CT-001', categoryIndex: 1, stock: 200 },
      { name: 'Denim Jacket', description: 'Classic blue denim jacket', price: 89.99, sku: 'DJ-002', categoryIndex: 1, stock: 40 },
      { name: 'Organic Green Tea', description: 'Premium loose leaf green tea 100g', price: 12.99, sku: 'GT-001', categoryIndex: 2, stock: 150 },
      { name: 'Olive Oil', description: 'Extra virgin olive oil 500ml', price: 15.99, sku: 'OO-001', categoryIndex: 2, stock: 80 },
      { name: 'Indoor Plant Pot', description: 'Ceramic planter with drainage', price: 24.99, sku: 'PP-001', categoryIndex: 3, stock: 60 },
      { name: 'Yoga Mat', description: 'Non-slip exercise mat 6mm', price: 29.99, sku: 'YM-001', categoryIndex: 4, stock: 75 },
    ];

    for (const p of products) {
      const product = productRepo.create({
        name: p.name,
        description: p.description,
        price: p.price,
        sku: p.sku,
        categoryId: savedCategories[p.categoryIndex].id,
        isActive: true,
      });
      const saved = await productRepo.save(product);

      const inventory = inventoryRepo.create({
        productId: saved.id,
        quantity: p.stock,
        minimumStock: 10,
      });
      await inventoryRepo.save(inventory);
      console.log(`Created product: ${p.name} (stock: ${p.stock})`);
    }

    await queryRunner.commitTransaction();
    console.log('\nSeed completed successfully!');
    console.log('Admin login:    admin@retail.com / Admin@123');
    console.log('Manager login:  manager@retail.com / Admin@123');
    console.log('Employee login: employee@retail.com / Admin@123');
  } catch (err) {
    await queryRunner.rollbackTransaction();
    console.error('Seed failed:', err);
    throw err;
  } finally {
    await queryRunner.release();
    await ds.destroy();
  }
}

seed();
