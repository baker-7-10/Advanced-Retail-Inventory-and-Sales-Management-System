import { ApiProperty } from '@nestjs/swagger';

export class InventoryStatsResponseDto {
  @ApiProperty({ example: 100, description: 'Total number of active products' })
  totalProducts: number;

  @ApiProperty({ example: 5, description: 'Number of low stock products' })
  lowStockProducts: number;

  @ApiProperty({ example: 2, description: 'Number of out of stock products' })
  outOfStockProducts: number;
}
