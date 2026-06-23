import { ApiProperty } from '@nestjs/swagger';

class InvoiceCashierDto {
  @ApiProperty({ example: 'John Doe', description: 'Cashier name' })
  name: string;

  @ApiProperty({ example: 'john@store.com', description: 'Cashier email' })
  email: string;
}

class InvoiceItemDto {
  @ApiProperty({ example: 'Gaming Mouse', description: 'Product name' })
  product: string;

  @ApiProperty({ example: 'SKU-GM-001', description: 'Product SKU' })
  sku: string;

  @ApiProperty({ example: 2, description: 'Quantity purchased' })
  quantity: number;

  @ApiProperty({ example: 49.99, description: 'Unit price' })
  unitPrice: number;

  @ApiProperty({ example: 99.98, description: 'Line subtotal' })
  subtotal: number;
}

export class InvoiceResponseDto {
  @ApiProperty({ example: 'INV-2026-a1b2c3', description: 'Invoice number' })
  invoiceNumber: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Sale date' })
  date: Date;

  @ApiProperty({ type: InvoiceCashierDto, description: 'Cashier details' })
  cashier: InvoiceCashierDto;

  @ApiProperty({ type: [InvoiceItemDto], description: 'Purchased items' })
  items: InvoiceItemDto[];

  @ApiProperty({ example: 199.96, description: 'Subtotal before discount' })
  subtotal: number;

  @ApiProperty({ example: 10, description: 'Discount percentage' })
  discountPercent: number;

  @ApiProperty({ example: 20.00, description: 'Discount amount' })
  discountAmount: number;

  @ApiProperty({ example: 179.96, description: 'Total after discount' })
  total: number;

  @ApiProperty({ example: 'VIP discount applied', description: 'Sale notes' })
  notes: string;
}
