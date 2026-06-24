import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from './entities/user.entity';
import { UsersRepository } from './repositories/users.repository';
import { AuditLogService } from '../common/services/audit-log.service';
import { AuditEvent } from '../common/audit/audit-event.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateUserDto, userId?: number): Promise<User> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException(`Email "${dto.email}" already registered`);
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepository.create({
      ...dto,
      password: hashedPassword,
    });
    this.auditLogService.log(AuditEvent.USER_CREATED, { userId });
    return user;
  }

  async findAll(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.usersRepository.findAllPaginated(skip, limit);
    return { data, meta: { total, page, limit } };
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOneWithSelect(id, [
      'id', 'name', 'email', 'role', 'isActive', 'createdAt',
    ]);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async update(
    id: number,
    dto: UpdateUserDto,
    currentUserId: number,
    userId?: number,
  ): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);

    if (dto.isActive === false && id === currentUserId) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    if (dto.isActive === false && user.role === UserRole.ADMIN) {
      const activeAdminCount = await this.usersRepository.countActiveAdmins();
      if (activeAdminCount <= 1) {
        throw new BadRequestException('Cannot deactivate the last active admin');
      }
    }

    if (dto.role && dto.role !== UserRole.ADMIN && user.role === UserRole.ADMIN) {
      const activeAdminCount = await this.usersRepository.countActiveAdmins();
      if (activeAdminCount <= 1) {
        throw new BadRequestException('Cannot change the role of the last active admin');
      }
    }

    Object.assign(user, dto);
    const updated = this.usersRepository.save(user);
    this.auditLogService.log(AuditEvent.USER_UPDATED, { userId });
    return updated;
  }

  async toggleActive(id: number, currentUserId?: number, userId?: number): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);

    if (user.role === UserRole.ADMIN) {
      const activeAdminCount = await this.usersRepository.countActiveAdmins();
      if (activeAdminCount <= 1) {
        if (id === currentUserId) {
          throw new BadRequestException('You cannot deactivate your own account');
        }
        throw new BadRequestException('Cannot deactivate the last active admin');
      }
    }

    if (id === currentUserId) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    user.isActive = !user.isActive;
    const updated = this.usersRepository.save(user);
    this.auditLogService.log(AuditEvent.USER_DEACTIVATED, { userId });
    return updated;
  }
}
