import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, SelectQueryBuilder, In } from 'typeorm';
import { Product } from '../entities/product.entity';
import { FilterProductDto } from '../dto/filter-product.dto';

@Injectable()
export class ProductsRepository {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
  ) {}

  private getRepo(manager?: EntityManager): Repository<Product> {
    return manager ? manager.getRepository(Product) : this.repo;
  }

  async findById(id: number, manager?: EntityManager): Promise<Product | null> {
    return this.getRepo(manager).findOne({
      where: { id, isActive: true },
      relations: ['category', 'inventory'],
    });
  }

  async findByIdOrFail(id: number, manager?: EntityManager): Promise<Product> {
    const product = await this.findById(id, manager);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async findByIds(ids: number[], manager?: EntityManager): Promise<Product[]> {
    if (ids.length === 0) return [];
    return this.getRepo(manager).find({
      where: { id: In(ids) },
      relations: { inventory: true },
    });
  }

  async findBySku(sku: string, manager?: EntityManager): Promise<Product | null> {
    return this.getRepo(manager).findOne({ where: { sku } });
  }

  async create(data: Partial<Product>, manager?: EntityManager): Promise<Product> {
    const repo = this.getRepo(manager);
    const entity = repo.create(data);
    return repo.save(entity);
  }

  async save(product: Product, manager?: EntityManager): Promise<Product> {
    return this.getRepo(manager).save(product);
  }

  async softDelete(id: number, manager?: EntityManager): Promise<void> {
    const repo = this.getRepo(manager);
    await repo.update(id, { isActive: false });
  }

  async findAllPaginated(filterDto: FilterProductDto, manager?: EntityManager) {
    const {
      search, categoryId, minPrice, maxPrice,
      inStock, page = 1, limit = 20,
      sortBy = 'createdAt', sortOrder = 'DESC',
    } = filterDto;

    const repo = this.getRepo(manager);
    let query: SelectQueryBuilder<Product> = repo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.inventory', 'inventory')
      .where('product.isActive = :isActive', { isActive: true });

    const searchTerm = search?.trim();
    const isFulltextSearch = !!searchTerm && searchTerm.length >= 3;

    if (searchTerm) {
      query.andWhere(
        '(product.name LIKE :search OR product.description LIKE :search OR product.sku LIKE :search)',
        { search: `%${searchTerm}%` },
      );

      if (isFulltextSearch) {
        try {
          query.addSelect(
            'MATCH(product.name, product.description, product.sku) AGAINST(:relevance IN BOOLEAN MODE)',
            'relevance',
          );
          query.setParameter('relevance', `${searchTerm}*`);
        } catch {
          // fulltext index unavailable — relevance sort skipped
        }
      }
    }

    if (categoryId) {
      query.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    if (minPrice !== undefined) {
      query.andWhere('product.price >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      query.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    if (inStock === true) {
      query.andWhere('inventory.quantity > 0');
    }

    if (isFulltextSearch) {
      query.orderBy('relevance', 'DESC');
    } else {
      const allowedSortColumns = ['name', 'price', 'stock', 'createdAt'];
      const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'createdAt';
      const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

      if (safeSortBy === 'stock') {
        query.orderBy('inventory.quantity', safeSortOrder);
      } else {
        query.orderBy(`product.${safeSortBy}`, safeSortOrder);
      }
    }

    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    let products: Product[];
    let total: number;
    try {
      [products, total] = await query.getManyAndCount();
    } catch {
      // fulltext MATCH in addSelect may fail if index is missing — retry without it
      query = repo
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.category', 'category')
        .leftJoinAndSelect('product.inventory', 'inventory')
        .where('product.isActive = :isActive', { isActive: true });

      if (searchTerm) {
        query.andWhere(
          '(product.name LIKE :search OR product.description LIKE :search OR product.sku LIKE :search)',
          { search: `%${searchTerm}%` },
        );
      }
      if (categoryId) query.andWhere('product.categoryId = :categoryId', { categoryId });
      if (minPrice !== undefined) query.andWhere('product.price >= :minPrice', { minPrice });
      if (maxPrice !== undefined) query.andWhere('product.price <= :maxPrice', { maxPrice });
      if (inStock === true) query.andWhere('inventory.quantity > 0');

      const allowedSortColumns = ['name', 'price', 'stock', 'createdAt'];
      const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'createdAt';
      const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';
      if (safeSortBy === 'stock') {
        query.orderBy('inventory.quantity', safeSortOrder);
      } else {
        query.orderBy(`product.${safeSortBy}`, safeSortOrder);
      }

      query.skip(skip).take(limit);
      [products, total] = await query.getManyAndCount();
    }

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  async countActive(manager?: EntityManager): Promise<number> {
    return this.getRepo(manager).count({ where: { isActive: true } });
  }

  async countActiveByCategory(categoryId: number, manager?: EntityManager): Promise<number> {
    return this.getRepo(manager).count({ where: { categoryId, isActive: true } });
  }
}
