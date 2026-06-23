import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class StockReportQueryDto {
  @ApiPropertyOptional({ example: 20, default: 10, description: 'Low stock threshold' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  threshold?: number = 10;
}
