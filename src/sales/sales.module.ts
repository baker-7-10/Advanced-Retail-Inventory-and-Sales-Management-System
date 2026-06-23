import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { SalesRepository } from './repositories/sales.repository';
import { SaleItemsRepository } from './repositories/sale-items.repository';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { ProductsModule } from '../products/products.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, SaleItem]),
    ProductsModule,
    InventoryModule,
    CommonModule,
  ],
  controllers: [SalesController],
  providers: [SalesService, SalesRepository, SaleItemsRepository],
  exports: [SalesService, SalesRepository, SaleItemsRepository],
})
export class SalesModule {}
