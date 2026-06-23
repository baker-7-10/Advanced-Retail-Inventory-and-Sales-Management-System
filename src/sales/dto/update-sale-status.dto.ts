import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SaleStatus } from '../entities/sale.entity';

export class UpdateSaleStatusDto {
  @ApiProperty({ enum: SaleStatus, description: 'New sale status' })
  @IsEnum(SaleStatus)
  status: SaleStatus;
}
