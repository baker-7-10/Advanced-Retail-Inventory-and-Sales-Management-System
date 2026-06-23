import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ProductsModule } from '../products/products.module';
import { SalesModule } from '../sales/sales.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [ProductsModule, SalesModule, InventoryModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
