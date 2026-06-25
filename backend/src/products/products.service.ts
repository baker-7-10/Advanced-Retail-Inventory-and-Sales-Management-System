import {
  Injectable, NotFoundException,
  BadRequestException, ConflictException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductsRepository } from './repositories/products.repository';
import { InventoryService } from '../inventory/inventory.service';
import { CategoriesRepository } from '../categories/repositories/categories.repository';
import { AuditLogService } from '../common/services/audit-log.service';
import { AuditEvent } from '../common/audit/audit-event.enum';
import { CreateProductDto } from './dto/create-product.dto';
import { FilterProductDto } from './dto/filter-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductDto } from './dto/search-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly inventoryService: InventoryService,
    private readonly categoriesRepository: CategoriesRepository,
    private readonly dataSource: DataSource,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(createProductDto: CreateProductDto, userId?: number): Promise<Product> {
    const category = await this.categoriesRepository.findById(createProductDto.categoryId);
    if (!category) {
      throw new BadRequestException(`Category with ID ${createProductDto.categoryId} not found`);
    }

    if (createProductDto.sku) {
      const existing = await this.productsRepository.findBySku(createProductDto.sku);
      if (existing) {
        throw new ConflictException(`Product with SKU "${createProductDto.sku}" already exists`);
      }
    }

    const { stock, ...productData } = createProductDto;

    const product = await this.dataSource.transaction(async (manager) => {
      const created = await this.productsRepository.create(productData, manager);
      await this.inventoryService.findOrCreate(created.id, stock ?? 0, manager);
      return created;
    });

    this.auditLogService.log(AuditEvent.PRODUCT_CREATED, { userId });
    return this.productsRepository.findByIdOrFail(product.id);
  }

  async findAll(filterDto: FilterProductDto) {
    return this.productsRepository.findAllPaginated(filterDto);
  }

  async findOne(id: number): Promise<Product> {
    return this.productsRepository.findByIdOrFail(id);
  }

  async update(id: number, updateDto: UpdateProductDto, userId?: number): Promise<Product> {
    const product = await this.productsRepository.findByIdOrFail(id);

    if (updateDto.sku && updateDto.sku !== product.sku) {
      const existing = await this.productsRepository.findBySku(updateDto.sku);
      if (existing && existing.id !== id) {
        throw new ConflictException(`SKU "${updateDto.sku}" already in use`);
      }
    }

    if (updateDto.categoryId) {
      const category = await this.categoriesRepository.findById(updateDto.categoryId);
      if (!category) {
        throw new BadRequestException(`Category with ID ${updateDto.categoryId} not found`);
      }
    }

    const { stock, ...productData } = updateDto;
    Object.assign(product, productData);

    await this.dataSource.transaction(async (manager) => {
      await this.productsRepository.save(product, manager);

      if (stock !== undefined) {
        await this.inventoryService.updateQuantity(id, stock, manager);
      }
    });

    this.auditLogService.log(AuditEvent.PRODUCT_UPDATED, { userId });
    return this.productsRepository.findByIdOrFail(id);
  }

  async remove(id: number, userId?: number): Promise<void> {
    await this.productsRepository.findByIdOrFail(id);
    await this.productsRepository.softDelete(id);
    this.auditLogService.log(AuditEvent.PRODUCT_DEACTIVATED, { userId });
  }

  async updateStock(id: number, quantityChange: number): Promise<Product> {
    const product = await this.productsRepository.findById(id);
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    const inventory = await this.inventoryService.findByProductId(id);
    const newStock = inventory.quantity + quantityChange;
    if (newStock < 0) {
      throw new BadRequestException(
        `Insufficient stock for "${product.name}". Available: ${inventory.quantity}, Requested: ${Math.abs(quantityChange)}`,
      );
    }

    await this.inventoryService.updateQuantity(id, newStock);

    return this.productsRepository.findByIdOrFail(id);
  }

  async getLowStockProducts(threshold: number = 10) {
    return this.inventoryService.getLowStockProducts(threshold);
  }

  async search(searchDto: SearchProductDto) {
    const { q, page = 1, limit = 20 } = searchDto;
    if (q) {
      const filterDto = new FilterProductDto();
      filterDto.search = q;
      filterDto.page = page;
      filterDto.limit = limit;
      return this.productsRepository.findAllPaginated(filterDto);
    }
    return this.productsRepository.findAllPaginated({ page, limit } as FilterProductDto);
  }
}
