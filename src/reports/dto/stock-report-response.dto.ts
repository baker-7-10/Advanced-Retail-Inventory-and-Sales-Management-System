import { ApiProperty } from '@nestjs/swagger';
import { InventoryResponseDto } from '../../inventory/dto/inventory-response.dto';
import { ProductResponseDto } from '../../products/dto/product-response.dto';

class StockSummaryDto {
  @ApiProperty({ example: 100, description: 'Total active products' })
  totalProducts: number;

  @ApiProperty({ example: 5, description: 'Products below minimum stock' })
  lowStock: number;

  @ApiProperty({ example: 2, description: 'Products with zero stock' })
  outOfStock: number;
}

export class StockReportItemDto {
  @ApiProperty({ type: InventoryResponseDto })
  inventory: InventoryResponseDto;

  @ApiProperty({ type: ProductResponseDto })
  product: ProductResponseDto;
}

export class StockReportResponseDto {
  @ApiProperty({ type: StockSummaryDto, description: 'Stock summary counts' })
  summary: StockSummaryDto;

  @ApiProperty({ type: [StockReportItemDto], description: 'Detailed stock list' })
  products: StockReportItemDto[];
}
