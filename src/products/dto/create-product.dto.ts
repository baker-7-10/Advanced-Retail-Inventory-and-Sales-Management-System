import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNumber, IsInt, IsOptional,
  MinLength, MaxLength, Min, IsPositive,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Samsung Galaxy S24', description: 'Product name' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Latest Samsung flagship phone' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 999.99, description: 'Product price' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price: number;

  @ApiProperty({ example: 50, description: 'Available stock quantity' })
  @IsInt()
  @Min(0)
  stock: number;

  @ApiProperty({ example: 1, description: 'Category ID' })
  @IsInt()
  @IsPositive()
  categoryId: number;

  @ApiPropertyOptional({ example: 'SAM-S24-BLK', description: 'SKU code' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;
}
