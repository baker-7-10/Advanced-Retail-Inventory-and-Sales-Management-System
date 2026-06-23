import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SaleStatus } from '../entities/sale.entity';

class SaleUserDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'john@store.com' })
  email: string;
}

class SaleItemResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  productId: number;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 49.99 })
  unitPrice: number;

  @ApiProperty({ example: 99.98 })
  subtotal: number;
}

export class SaleResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'INV-2026-A1B2C3' })
  invoiceNumber: string;

  @ApiProperty({ example: 199.96 })
  subtotal: number;

  @ApiProperty({ example: 10 })
  discountPercent: number;

  @ApiProperty({ example: 19.99 })
  discountAmount: number;

  @ApiProperty({ example: 179.97 })
  total: number;

  @ApiProperty({ enum: SaleStatus, example: SaleStatus.COMPLETED })
  status: SaleStatus;

  @ApiPropertyOptional({ example: 'VIP discount' })
  notes: string;

  @ApiProperty({ type: SaleUserDto })
  user: SaleUserDto;

  @ApiProperty({ type: [SaleItemResponseDto] })
  items: SaleItemResponseDto[];

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;
}

class SalesPaginationMetaDto {
  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

export class PaginatedSalesResponseDto {
  @ApiProperty({ type: [SaleResponseDto] })
  data: SaleResponseDto[];

  @ApiProperty({ type: SalesPaginationMetaDto })
  meta: SalesPaginationMetaDto;
}
