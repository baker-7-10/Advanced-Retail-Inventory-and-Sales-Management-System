import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsInt, IsNumber, IsOptional,
  IsPositive, IsString, IsEnum, Min, Max, ValidateNested, ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../entities/sale.entity';

export class SaleItemDto {
  @ApiProperty({ example: 1, description: 'Product ID' })
  @IsInt()
  @IsPositive()
  productId: number;

  @ApiProperty({ example: 2, description: 'Quantity to purchase' })
  @IsInt()
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number;
}

export class CreateSaleDto {
  @ApiProperty({
    type: [SaleItemDto],
    description: 'List of products in the cart',
    example: [{ productId: 1, quantity: 2 }, { productId: 3, quantity: 1 }],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Cart must have at least one item' })
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @ApiPropertyOptional({ example: 10, description: 'Discount percentage (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number = 0;

  @ApiPropertyOptional({ example: 'VIP customer discount' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.CASH, description: 'Payment method' })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
