import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateMinimumStockDto {
  @ApiProperty({ example: 20, description: 'New minimum stock threshold' })
  @IsInt()
  @Min(0)
  minimumStock: number;
}
