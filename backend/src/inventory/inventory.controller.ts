import {
  Controller, Get, Patch, Param, Query, Body,
  UseGuards, ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiOkResponse, ApiBadRequestResponse,
  ApiUnauthorizedResponse, ApiForbiddenResponse,
  ApiNotFoundResponse, ApiExtraModels,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { LowStockQueryDto } from './dto/low-stock-query.dto';
import { UpdateMinimumStockDto } from './dto/update-minimum-stock.dto';
import { InventoryResponseDto } from './dto/inventory-response.dto';
import { InventoryStatsResponseDto } from './dto/inventory-stats-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UserRole } from '../users/entities/user.entity';
import { WrappedSchema, WrappedArraySchema } from '../common/swagger/wrapped-response.swagger';

@ApiTags('Inventory')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(InventoryResponseDto, InventoryStatsResponseDto)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('low-stock')
  @ApiOperation({ summary: 'Get low stock products' })
  @ApiOkResponse({ description: 'Low stock products retrieved successfully', schema: WrappedArraySchema(InventoryResponseDto) })
  @ApiBadRequestResponse({ description: 'Invalid threshold value' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  getLowStock(@Query() query: LowStockQueryDto) {
    return this.inventoryService.getLowStockProducts(query.threshold, query.page, query.limit);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get inventory statistics' })
  @ApiOkResponse({ description: 'Inventory statistics retrieved successfully', schema: WrappedSchema(InventoryStatsResponseDto) })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  getStats() {
    return this.inventoryService.getStats();
  }

  @Patch(':productId/minimum-stock')
  @ApiOperation({ summary: 'Update minimum stock threshold' })
  @ApiOkResponse({ description: 'Minimum stock updated successfully', schema: WrappedSchema(InventoryResponseDto) })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Inventory not found' })
  updateMinimumStock(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: UpdateMinimumStockDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.updateMinimumStock(productId, dto.minimumStock, user.id);
  }
}
