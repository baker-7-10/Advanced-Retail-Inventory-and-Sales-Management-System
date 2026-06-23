import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

class PaginationMetaDto {
  @ApiProperty({ example: 50, description: 'Total number of users matching the query' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 20, description: 'Number of items per page' })
  limit: number;
}

export class PaginatedUsersResponseDto {
  @ApiProperty({ type: [UserResponseDto], description: 'Array of users for the current page' })
  data: UserResponseDto[];

  @ApiProperty({ type: PaginationMetaDto, description: 'Pagination metadata' })
  meta: PaginationMetaDto;
}
