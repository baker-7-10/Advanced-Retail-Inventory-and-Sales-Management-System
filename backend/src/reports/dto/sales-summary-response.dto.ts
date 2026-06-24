import { ApiProperty } from '@nestjs/swagger';

export class SalesSummaryResponseDto {
  @ApiProperty({ example: 150, description: 'Total number of transactions' })
  totalTransactions: number;

  @ApiProperty({ example: 50000, description: 'Total revenue' })
  totalRevenue: number;

  @ApiProperty({ example: 333.33, description: 'Average sale value' })
  averageSale: number;

  @ApiProperty({ example: 2500, description: 'Total discount given' })
  totalDiscount: number;
}
