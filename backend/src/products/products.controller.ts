import {
  Controller, Get, Post, Body, Patch, Param,
  Delete, Query, UseGuards, ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiQuery,
  ApiOkResponse, ApiCreatedResponse, ApiNoContentResponse, ApiUnauthorizedResponse,
  ApiForbiddenResponse, ApiNotFoundResponse, ApiBadRequestResponse,
  ApiConflictResponse, ApiBody, ApiExtraModels,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDto } from './dto/filter-product.dto';
import { SearchProductDto } from './dto/search-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { PaginatedProductsResponseDto } from './dto/paginated-products-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SkipThrottle } from '@nestjs/throttler';
import { SuccessMessage } from '../common/decorators/success-message.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UserRole } from '../users/entities/user.entity';
import { WrappedSchema, WrappedArraySchema } from '../common/swagger/wrapped-response.swagger';

@ApiTags('Products')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(ProductResponseDto, PaginatedProductsResponseDto)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @SuccessMessage('Product created successfully')
  @ApiOperation({ summary: 'Create product' })
  @ApiBody({ type: CreateProductDto })
  @ApiCreatedResponse({ description: 'Product created successfully', schema: WrappedSchema(ProductResponseDto) })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'SKU already exists' })
  async create(@Body() createProductDto: CreateProductDto, @CurrentUser() user: AuthenticatedUser): Promise<ProductResponseDto> {
    return this.productsService.create(createProductDto, user.id);
  }

  @Get()
  @SkipThrottle()
  @ApiOperation({ summary: 'Get paginated products' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by name, description or SKU' })
  @ApiQuery({ name: 'categoryId', required: false, type: Number, description: 'Filter by category ID' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Minimum price filter' })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Maximum price filter' })
  @ApiQuery({ name: 'inStock', required: false, type: Boolean, description: 'Filter in-stock only' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort field (name, price, stock, createdAt)' })
  @ApiQuery({ name: 'sortOrder', required: false, type: String, description: 'Sort order (ASC or DESC)' })
  @ApiOkResponse({ description: 'Products retrieved successfully', schema: WrappedSchema(PaginatedProductsResponseDto) })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  findAll(@Query() filterDto: FilterProductDto): Promise<PaginatedProductsResponseDto> {
    return this.productsService.findAll(filterDto);
  }

  @Get('search')
  @SkipThrottle()
  @ApiOperation({ summary: 'Full-text search products' })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query (full-text search on name and description)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiOkResponse({ description: 'Search results retrieved successfully', schema: WrappedSchema(PaginatedProductsResponseDto) })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  search(@Query() searchDto: SearchProductDto): Promise<PaginatedProductsResponseDto> {
    return this.productsService.search(searchDto);
  }

  @Get('low-stock')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get low stock products' })
  @ApiQuery({ name: 'threshold', required: false, type: Number, example: 10, description: 'Stock threshold (default: 10)' })
  @ApiOkResponse({ description: 'Low stock products retrieved successfully', schema: WrappedArraySchema(ProductResponseDto) })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  getLowStock(@Query('threshold') threshold: number = 10) {
    return this.productsService.getLowStockProducts(threshold);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiOkResponse({ description: 'Product retrieved successfully', schema: WrappedSchema(ProductResponseDto) })
  @ApiNotFoundResponse({ description: 'Product not found' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ProductResponseDto> {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @SuccessMessage('Product updated successfully')
  @ApiOperation({ summary: 'Update product' })
  @ApiBody({ type: UpdateProductDto })
  @ApiOkResponse({ description: 'Product updated successfully', schema: WrappedSchema(ProductResponseDto) })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiConflictResponse({ description: 'SKU already in use' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProductResponseDto> {
    return this.productsService.update(id, updateProductDto, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate product' })
  @ApiNoContentResponse({ description: 'Product deactivated successfully' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.productsService.remove(id, user.id);
  }
}
