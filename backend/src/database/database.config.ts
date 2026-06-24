import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { Product } from '../products/entities/product.entity';
import { Sale } from '../sales/entities/sale.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { Inventory } from '../inventory/inventory.entity';

export function createTypeOrmOptions(configService: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'mysql',
    host: configService.get('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 3306),
    username: configService.get('DB_USERNAME', 'root'),
    password: configService.get('DB_PASSWORD', ''),
    database: configService.get('DB_NAME', 'retail_db'),
    entities: [User, Category, Product, Sale, SaleItem, Inventory],
    synchronize: false,
    migrationsRun: false,
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    logging: configService.get('NODE_ENV') === 'development',
    charset: 'utf8mb4',
    extra: {
      connectionLimit: 10,
      acquireTimeout: 60000,
      timeout: 60000,
    },
  };
}
