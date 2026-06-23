import { ApiProperty } from '@nestjs/swagger';

export class TopProductsResponseDto {
  @ApiProperty({ example: 1, description: 'Product ID' })
  productId: number;

  @ApiProperty({ example: 'Gaming Mouse', description: 'Product name' })
  productName: string;

  @ApiProperty({ example: 50, description: 'Total units sold' })
  totalSold: number;

  @ApiProperty({ example: 2499.50, description: 'Total revenue from product' })
  totalRevenue: number;
}
