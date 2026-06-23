import { ApiProperty } from '@nestjs/swagger';

export class InventoryResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier' })
  id: number;

  @ApiProperty({ example: 1, description: 'Product ID' })
  productId: number;

  @ApiProperty({ example: 100, description: 'Current stock quantity' })
  quantity: number;

  @ApiProperty({ example: 10, description: 'Minimum stock threshold' })
  minimumStock: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Last update timestamp' })
  updatedAt: Date;
}
