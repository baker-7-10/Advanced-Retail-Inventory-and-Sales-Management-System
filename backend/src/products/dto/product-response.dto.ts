import { ApiProperty } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier' })
  id: number;

  @ApiProperty({ example: 'Gaming Mouse', description: 'Product name' })
  name: string;

  @ApiProperty({ example: 'SKU-1001', description: 'Stock keeping unit', nullable: true })
  sku: string;

  @ApiProperty({ example: 'High-performance wireless gaming mouse', description: 'Product description', nullable: true })
  description: string;

  @ApiProperty({ example: 49.99, description: 'Product price' })
  price: number;

  @ApiProperty({ example: 100, description: 'Available stock quantity' })
  stock: number;

  @ApiProperty({ example: true, description: 'Whether the product is active' })
  isActive: boolean;

  @ApiProperty({ example: 1, description: 'Category ID' })
  categoryId: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Last update timestamp' })
  updatedAt: Date;
}
