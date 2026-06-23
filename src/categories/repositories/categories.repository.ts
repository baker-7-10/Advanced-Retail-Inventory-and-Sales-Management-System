import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, ILike } from 'typeorm';
import { Category } from '../entities/category.entity';

@Injectable()
export class CategoriesRepository {
  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
  ) {}

  private getRepo(manager?: EntityManager): Repository<Category> {
    return manager ? manager.getRepository(Category) : this.repo;
  }

  async findById(id: number, manager?: EntityManager): Promise<Category | null> {
    return this.getRepo(manager).findOne({ where: { id } });
  }

  async findByIdOrFail(id: number, manager?: EntityManager): Promise<Category> {
    const category = await this.findById(id, manager);
    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }
    return category;
  }

  async findByName(name: string, manager?: EntityManager): Promise<Category | null> {
    return this.getRepo(manager).findOne({ where: { name } });
  }

  async findByNameInsensitive(name: string, manager?: EntityManager): Promise<Category | null> {
    const normalized = name.trim().toLowerCase();
    return this.getRepo(manager)
      .createQueryBuilder('category')
      .where('LOWER(category.name) = :name', { name: normalized })
      .getOne();
  }

  async findAllPaginated(
    page: number,
    limit: number,
    search?: string,
    isActive?: boolean,
    manager?: EntityManager,
  ) {
    const repo = this.getRepo(manager);
    const query = repo
      .createQueryBuilder('category')
      .orderBy('category.name', 'ASC');

    if (search) {
      query.andWhere('LOWER(category.name) LIKE :search', { search: `%${search.toLowerCase()}%` });
    }
    if (isActive !== undefined) {
      query.andWhere('category.isActive = :isActive', { isActive });
    }

    query.skip((page - 1) * limit).take(limit);

    const [categories, total] = await query.getManyAndCount();

    return {
      data: categories,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(data: Partial<Category>, manager?: EntityManager): Promise<Category> {
    const repo = this.getRepo(manager);
    const entity = repo.create(data);
    return repo.save(entity);
  }

  async save(category: Category, manager?: EntityManager): Promise<Category> {
    return this.getRepo(manager).save(category);
  }

  async softDelete(id: number, manager?: EntityManager): Promise<void> {
    const repo = this.getRepo(manager);
    await repo.update(id, { isActive: false });
  }
}
