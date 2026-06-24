import {
  Injectable, NotFoundException, ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Category } from './entities/category.entity';
import { CategoriesRepository } from './repositories/categories.repository';
import { ProductsRepository } from '../products/repositories/products.repository';
import { AuditLogService } from '../common/services/audit-log.service';
import { AuditEvent } from '../common/audit/audit-event.enum';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryQueryDto } from './dto/category-query.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoriesRepository: CategoriesRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateCategoryDto, userId?: number): Promise<Category> {
    const normalized = dto.name.trim();
    const existing = await this.categoriesRepository.findByNameInsensitive(normalized);
    if (existing) {
      throw new ConflictException(`Category "${dto.name}" already exists`);
    }

    const category = this.categoriesRepository.create({ ...dto, name: normalized });

    this.auditLogService.log(AuditEvent.CATEGORY_CREATED, { userId });
    return category;
  }

  async findAll(query: CategoryQueryDto) {
    return this.categoriesRepository.findAllPaginated(
      query.page ?? 1,
      query.limit ?? 20,
      query.search,
      query.isActive,
    );
  }

  async findOne(id: number): Promise<Category> {
    return this.categoriesRepository.findByIdOrFail(id);
  }

  async update(id: number, dto: UpdateCategoryDto, userId?: number): Promise<Category> {
    const category = await this.categoriesRepository.findByIdOrFail(id);

    if (dto.name) {
      const normalized = dto.name.trim();
      const existing = await this.categoriesRepository.findByNameInsensitive(normalized);
      if (existing && existing.id !== id) {
        throw new ConflictException('Category name already exists');
      }
      Object.assign(category, { ...dto, name: normalized });
    } else {
      Object.assign(category, dto);
    }

    const updated = this.categoriesRepository.save(category);
    this.auditLogService.log(AuditEvent.CATEGORY_UPDATED, { userId });
    return updated;
  }

  async deactivate(id: number, userId?: number): Promise<void> {
    const category = await this.categoriesRepository.findByIdOrFail(id);
    if (!category.isActive) {
      throw new BadRequestException('Category is already inactive');
    }

    const activeProducts = await this.productsRepository.countActiveByCategory(id);
    if (activeProducts > 0) {
      throw new BadRequestException('Cannot deactivate category with active products');
    }

    await this.categoriesRepository.softDelete(id);

    this.auditLogService.log(AuditEvent.CATEGORY_DEACTIVATED, { userId });
  }
}
