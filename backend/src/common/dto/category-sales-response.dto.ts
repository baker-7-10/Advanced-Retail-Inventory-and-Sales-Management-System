import { ApiProperty } from '@nestjs/swagger';

export class CategorySalesResponseDto {
  @ApiProperty({ example: 'Electronics', description: 'Category name' })
  categoryName: string;

  @ApiProperty({ example: 120, description: 'Total units sold in category' })
  totalSold: number;

  @ApiProperty({ example: 15000, description: 'Total revenue from category' })
  totalRevenue: number;
}
