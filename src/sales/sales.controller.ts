import {
  Controller, Get, Post, Patch, Body, Param,
  UseGuards, ParseIntPipe, Query,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiBody,
  ApiOkResponse, ApiCreatedResponse, ApiNotFoundResponse,
  ApiBadRequestResponse, ApiUnauthorizedResponse, ApiForbiddenResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SalesQueryDto } from './dto/sales-query.dto';
import { UpdateSaleStatusDto } from './dto/update-sale-status.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { SaleResponseDto, PaginatedSalesResponseDto } from './dto/sale-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SuccessMessage } from '../common/decorators/success-message.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UserRole } from '../users/entities/user.entity';
import { WrappedSchema } from '../common/swagger/wrapped-response.swagger';

@ApiTags('sales')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(SaleResponseDto, PaginatedSalesResponseDto, InvoiceResponseDto)
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
@ApiForbiddenResponse({ description: 'Insufficient role permissions' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @SuccessMessage('Sale completed successfully')
  @ApiOperation({ summary: 'Process a sale transaction (checkout cart)' })
  @ApiBody({ type: CreateSaleDto })
  @ApiCreatedResponse({ description: 'Sale processed successfully', schema: WrappedSchema(SaleResponseDto) })
  @ApiBadRequestResponse({ description: 'Validation failed or insufficient stock' })
  @ApiNotFoundResponse({ description: 'One or more products not found' })
  create(@Body() createSaleDto: CreateSaleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.salesService.create(createSaleDto, user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all sales transactions' })
  @ApiOkResponse({ description: 'Paginated list of sales', schema: WrappedSchema(PaginatedSalesResponseDto) })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  findAll(@Query() query: SalesQueryDto) {
    return this.salesService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get a specific sale by ID' })
  @ApiOkResponse({ description: 'Sale details', schema: WrappedSchema(SaleResponseDto) })
  @ApiNotFoundResponse({ description: 'Sale not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.findOne(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @SuccessMessage('Sale status updated')
  @ApiOperation({ summary: 'Update sale status' })
  @ApiBody({ type: UpdateSaleStatusDto })
  @ApiOkResponse({ description: 'Sale status updated', schema: WrappedSchema(SaleResponseDto) })
  @ApiNotFoundResponse({ description: 'Sale not found' })
  @ApiBadRequestResponse({ description: 'Invalid status transition' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSaleStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesService.updateStatus(id, dto.status, user.id);
  }

  @Get(':id/invoice')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get invoice data for a sale' })
  @ApiOkResponse({ description: 'Formatted invoice data', schema: WrappedSchema(InvoiceResponseDto) })
  @ApiNotFoundResponse({ description: 'Sale not found' })
  getInvoice(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.getInvoice(id);
  }
}
