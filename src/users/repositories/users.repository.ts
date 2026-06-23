import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  private getRepo(manager?: EntityManager): Repository<User> {
    return manager ? manager.getRepository(User) : this.repo;
  }

  async findById(id: number, manager?: EntityManager): Promise<User | null> {
    return this.getRepo(manager).findOne({ where: { id } });
  }

  async findByEmail(email: string, manager?: EntityManager): Promise<User | null> {
    return this.getRepo(manager).findOne({ where: { email } });
  }

  /**
   * Loads user with auth-sensitive fields (password, hashedRefreshToken, etc.)
   * Only use in authentication workflows where explicit access is required.
   */
  async findByIdWithPassword(id: number, manager?: EntityManager): Promise<User | null> {
    return this.getRepo(manager)
      .createQueryBuilder('user')
      .where('user.id = :id', { id })
      .addSelect('user.password')
      .addSelect('user.hashedRefreshToken')
      .addSelect('user.failedLoginAttempts')
      .addSelect('user.lockedUntil')
      .getOne();
  }

  /**
   * Loads user by email with auth-sensitive fields (password, hashedRefreshToken, etc.)
   * Only use in authentication workflows where explicit access is required.
   */
  async findByEmailWithPassword(email: string, manager?: EntityManager): Promise<User | null> {
    return this.getRepo(manager)
      .createQueryBuilder('user')
      .where('user.email = :email', { email })
      .addSelect('user.password')
      .addSelect('user.hashedRefreshToken')
      .addSelect('user.failedLoginAttempts')
      .addSelect('user.lockedUntil')
      .getOne();
  }

  async findAllPaginated(
    skip: number,
    take: number,
    manager?: EntityManager,
  ): Promise<[User[], number]> {
    return this.getRepo(manager).findAndCount({
      select: ['id', 'name', 'email', 'role', 'isActive', 'createdAt'],
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  async findOneWithSelect(
    id: number,
    select: (keyof User)[],
    manager?: EntityManager,
  ): Promise<User | null> {
    return this.getRepo(manager).findOne({
      where: { id },
      select,
    });
  }

  async countActiveAdmins(manager?: EntityManager): Promise<number> {
    return this.getRepo(manager).count({
      where: { role: UserRole.ADMIN, isActive: true },
    });
  }

  async create(data: Partial<User>, manager?: EntityManager): Promise<User> {
    const repo = this.getRepo(manager);
    const entity = repo.create(data);
    return repo.save(entity);
  }

  async save(user: User, manager?: EntityManager): Promise<User> {
    return this.getRepo(manager).save(user);
  }
}
