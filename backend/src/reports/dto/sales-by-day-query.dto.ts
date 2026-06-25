import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, Validate } from 'class-validator';
import { IsAfterStartDateConstraint } from '../validators/is-after-start-date.validator';

export class SalesByDayQueryDto {
  @ApiProperty({ example: '2024-01-01', description: 'Start date (ISO 8601)' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: '2024-12-31', description: 'End date (ISO 8601). Defaults to today.' })
  @IsOptional()
  @IsDateString()
  @Validate(IsAfterStartDateConstraint)
  endDate?: string;
}
