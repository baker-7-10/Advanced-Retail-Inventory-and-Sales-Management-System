import { ApiProperty } from '@nestjs/swagger';
import { ProductResponseDto } from './product-response.dto';

class PaginationMetaDto {
  @ApiProperty({ example: 50, description: 'Total number of products matching the query' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 20, description: 'Number of items per page' })
  limit: number;
}

export class PaginatedProductsResponseDto {
  @ApiProperty({ type: [ProductResponseDto], description: 'Array of products for the current page' })
  data: ProductResponseDto[];

  @ApiProperty({ type: PaginationMetaDto, description: 'Pagination metadata' })
  meta: PaginationMetaDto;
}
