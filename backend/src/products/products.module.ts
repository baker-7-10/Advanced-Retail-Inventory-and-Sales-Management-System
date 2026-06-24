import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductsRepository } from './repositories/products.repository';
import { InventoryModule } from '../inventory/inventory.module';
import { CategoriesModule } from '../categories/categories.module';
import { Product } from './entities/product.entity';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    InventoryModule,
    forwardRef(() => CategoriesModule),
    CommonModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsRepository],
  exports: [ProductsService, ProductsRepository],
})
export class ProductsModule {}
