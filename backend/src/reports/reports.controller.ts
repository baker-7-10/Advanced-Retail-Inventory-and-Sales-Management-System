import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiOkResponse, ApiBadRequestResponse,
  ApiUnauthorizedResponse, ApiForbiddenResponse, ApiExtraModels,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ReportsService } from './reports.service';
import { ReportsQueryDto } from './dto/reports-query.dto';
import { SalesByDayQueryDto } from './dto/sales-by-day-query.dto';
import { StockReportQueryDto } from './dto/stock-report-query.dto';
import { SalesSummaryResponseDto } from './dto/sales-summary-response.dto';
import { DailySalesResponseDto } from './dto/daily-sales-response.dto';
import { TopProductsResponseDto } from './dto/top-products-response.dto';
import { CategorySalesResponseDto } from './dto/category-sales-response.dto';
import { StockReportResponseDto } from './dto/stock-report-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { WrappedSchema, WrappedArraySchema } from '../common/swagger/wrapped-response.swagger';

@ApiTags('reports')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(
  SalesSummaryResponseDto, DailySalesResponseDto,
  TopProductsResponseDto, CategorySalesResponseDto, StockReportResponseDto,
)
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
@ApiForbiddenResponse({ description: 'Insufficient role permissions' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Throttle({ default: { limit: 20, ttl: 60000 } })
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Sales summary: revenue, transactions, averages' })
  @ApiOkResponse({ description: 'Aggregated sales summary', schema: WrappedSchema(SalesSummaryResponseDto) })
  @ApiBadRequestResponse({ description: 'Invalid date format in startDate or endDate' })
  getSalesSummary(@Query() query: ReportsQueryDto) {
    return this.reportsService.getSalesSummary(query.startDate, query.endDate);
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Top selling products by quantity' })
  @ApiOkResponse({ description: 'Top products by units sold', schema: WrappedArraySchema(TopProductsResponseDto) })
  @ApiBadRequestResponse({ description: 'Invalid limit, startDate, or endDate' })
  getTopProducts(@Query() query: ReportsQueryDto) {
    return this.reportsService.getTopProducts(query.limit, query.startDate, query.endDate, query.page);
  }

  @Get('sales-by-day')
  @ApiOperation({ summary: 'Daily revenue chart data' })
  @ApiOkResponse({ description: 'Daily sales breakdown', schema: WrappedArraySchema(DailySalesResponseDto) })
  @ApiBadRequestResponse({ description: 'startDate and endDate are required (ISO 8601)' })
  getSalesByDay(@Query() query: SalesByDayQueryDto) {
    const endDate = query.endDate ?? new Date().toISOString().slice(0, 10);
    return this.reportsService.getSalesByDay(query.startDate, endDate);
  }

  @Get('sales-by-category')
  @ApiOperation({ summary: 'Revenue breakdown by category' })
  @ApiOkResponse({ description: 'Sales grouped by category', schema: WrappedArraySchema(CategorySalesResponseDto) })
  @ApiBadRequestResponse({ description: 'Invalid date format in startDate or endDate' })
  getSalesByCategory(@Query() query: ReportsQueryDto) {
    return this.reportsService.getSalesByCategory(query.startDate, query.endDate, query.page, query.limit);
  }

  @Get('stock')
  @ApiOperation({ summary: 'Stock levels report with low-stock alerts' })
  @ApiOkResponse({ description: 'Current stock levels', schema: WrappedSchema(StockReportResponseDto) })
  @ApiBadRequestResponse({ description: 'Invalid threshold value' })
  getStockReport(@Query() query: StockReportQueryDto) {
    return this.reportsService.getStockReport(query.threshold);
  }
}
