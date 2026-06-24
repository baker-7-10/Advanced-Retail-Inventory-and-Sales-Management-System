import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventory } from './entities/inventory.entity';
import { InventoryRepository } from './repositories/inventory.repository';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InventoryGateway } from './inventory.gateway';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventory]),
    AuthModule,
    CommonModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryRepository, InventoryGateway],
  exports: [InventoryService, InventoryRepository, InventoryGateway],
})
export class InventoryModule {}
