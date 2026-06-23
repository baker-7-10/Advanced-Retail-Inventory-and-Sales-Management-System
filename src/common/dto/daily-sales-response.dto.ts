import { ApiProperty } from '@nestjs/swagger';

export class DailySalesResponseDto {
  @ApiProperty({ example: '2024-01-15', description: 'Date' })
  date: string;

  @ApiProperty({ example: 12, description: 'Number of transactions' })
  transactions: number;

  @ApiProperty({ example: 4200, description: 'Revenue for the day' })
  revenue: number;
}
