import {
  Controller, Get, Post, Body, Param, Patch, Query,
  UseGuards, ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiQuery,
  ApiOkResponse, ApiCreatedResponse, ApiUnauthorizedResponse,
  ApiForbiddenResponse, ApiNotFoundResponse, ApiBadRequestResponse,
  ApiConflictResponse, ApiExtraModels,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { PaginatedUsersResponseDto } from './dto/paginated-users-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SuccessMessage } from '../common/decorators/success-message.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UserRole } from './entities/user.entity';
import { WrappedSchema } from '../common/swagger/wrapped-response.swagger';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(UserResponseDto, PaginatedUsersResponseDto)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @SuccessMessage('User created successfully')
  @ApiOperation({ summary: 'Create user' })
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse({ description: 'User created successfully', schema: WrappedSchema(UserResponseDto) })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiConflictResponse({ description: 'Email already exists' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.usersService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated users' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20, max: 100)' })
  @ApiOkResponse({ description: 'Users retrieved successfully', schema: WrappedSchema(PaginatedUsersResponseDto) })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiBadRequestResponse({ description: 'Invalid pagination parameters' })
  findAll(@Query() query: PaginationQueryDto): Promise<PaginatedUsersResponseDto> {
    return this.usersService.findAll(query.page ?? 1, query.limit ?? 20);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiOkResponse({ description: 'User retrieved successfully', schema: WrappedSchema(UserResponseDto) })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'User not found' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @SuccessMessage('User updated successfully')
  @ApiOperation({ summary: 'Update user' })
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({ description: 'User updated successfully', schema: WrappedSchema(UserResponseDto) })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'User not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, dto, currentUser.id);
  }

  @Patch(':id/toggle-active')
  @SuccessMessage('User status toggled successfully')
  @ApiOperation({ summary: 'Activate or deactivate user' })
  @ApiOkResponse({ description: 'User status toggled successfully', schema: WrappedSchema(UserResponseDto) })
  @ApiBadRequestResponse({ description: 'Cannot deactivate yourself / Cannot deactivate last active admin' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'User not found' })
  toggleActive(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.usersService.toggleActive(id, currentUser.id);
  }
}
