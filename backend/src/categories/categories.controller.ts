import {
  Controller, Get, Post, Body, Patch, Param,
  Delete, UseGuards, ParseIntPipe, HttpCode, HttpStatus, Query,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiOkResponse, ApiCreatedResponse, ApiNoContentResponse,
  ApiBadRequestResponse, ApiConflictResponse, ApiNotFoundResponse,
  ApiUnauthorizedResponse, ApiForbiddenResponse, ApiExtraModels,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryQueryDto } from './dto/category-query.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { PaginatedCategoryResponseDto } from './dto/paginated-category-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SkipThrottle } from '@nestjs/throttler';
import { SuccessMessage } from '../common/decorators/success-message.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UserRole } from '../users/entities/user.entity';
import { WrappedSchema } from '../common/swagger/wrapped-response.swagger';

@ApiTags('categories')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(CategoryResponseDto, PaginatedCategoryResponseDto)
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
@ApiForbiddenResponse({ description: 'Insufficient role permissions' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @SuccessMessage('Category created successfully')
  @ApiOperation({ summary: 'Create a new category' })
  @ApiCreatedResponse({ description: 'Category created', schema: WrappedSchema(CategoryResponseDto) })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Category name already exists' })
  create(@Body() dto: CreateCategoryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.categoriesService.create(dto, user.id);
  }

  @Get()
  @SkipThrottle()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get all categories with pagination, search, and filters' })
  @ApiOkResponse({ description: 'Paginated list of categories', schema: WrappedSchema(PaginatedCategoryResponseDto) })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  findAll(@Query() query: CategoryQueryDto) {
    return this.categoriesService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiOkResponse({ description: 'Category found', schema: WrappedSchema(CategoryResponseDto) })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiBadRequestResponse({ description: 'Invalid ID format' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @SuccessMessage('Category updated successfully')
  @ApiOperation({ summary: 'Update a category' })
  @ApiOkResponse({ description: 'Category updated', schema: WrappedSchema(CategoryResponseDto) })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiConflictResponse({ description: 'Category name already exists' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.categoriesService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate a category' })
  @ApiNoContentResponse({ description: 'Category deactivated successfully' })
  @ApiBadRequestResponse({ description: 'Cannot deactivate category with active products' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  deactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.categoriesService.deactivate(id, user.id);
  }
}
