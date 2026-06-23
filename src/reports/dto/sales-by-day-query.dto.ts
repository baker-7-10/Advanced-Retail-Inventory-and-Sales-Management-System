import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, Validate } from 'class-validator';
import { IsAfterStartDateConstraint } from '../validators/is-after-start-date.validator';

export class SalesByDayQueryDto {
  @ApiProperty({ example: '2024-01-01', description: 'Start date (required, ISO 8601)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2024-12-31', description: 'End date (required, ISO 8601)' })
  @IsDateString()
  @Validate(IsAfterStartDateConstraint)
  endDate: string;
}
