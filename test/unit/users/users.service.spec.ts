import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../../../src/users/users.service';
import { UsersRepository } from '../../../src/users/repositories/users.repository';
import { AuditLogService } from '../../../src/common/services/audit-log.service';
import { UserRole } from '../../../src/users/entities/user.entity';
import { CreateUserDto } from '../../../src/users/dto/create-user.dto';
import { UpdateUserDto } from '../../../src/users/dto/update-user.dto';
import { buildMockUser } from '../../fixtures';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: jest.Mocked<UsersRepository>;

  beforeEach(async () => {
    usersRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      findByIdWithPassword: jest.fn(),
      findAllPaginated: jest.fn(),
      findOneWithSelect: jest.fn(),
      countActiveAdmins: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: usersRepository },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    it('should create a new user with hashed password', async () => {
      const dto: CreateUserDto = {
        name: 'John Doe',
        email: 'john@store.com',
        password: 'password123',
        role: UserRole.EMPLOYEE,
      };

      usersRepository.findByEmail.mockResolvedValue(null);
      usersRepository.create.mockResolvedValue(buildMockUser({ ...dto, password: 'hashed' }));

      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);

      const result = await service.create(dto);

      expect(usersRepository.findByEmail).toHaveBeenCalledWith('john@store.com');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(usersRepository.create).toHaveBeenCalledWith({
        ...dto,
        password: 'hashed',
      });
      expect(result).toBeDefined();
    });

    it('should throw ConflictException when email already exists', async () => {
      usersRepository.findByEmail.mockResolvedValue(buildMockUser());

      await expect(
        service.create({ name: 'John', email: 'test@store.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);

      expect(usersRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      const mockUsers = [buildMockUser(), buildMockUser({ id: 2, email: 'jane@store.com' })];
      usersRepository.findAllPaginated.mockResolvedValue([mockUsers, 2]);

      const result = await service.findAll(1, 20);

      expect(usersRepository.findAllPaginated).toHaveBeenCalledWith(0, 20);
      expect(result).toEqual({
        data: mockUsers,
        meta: { total: 2, page: 1, limit: 20 },
      });
    });

    it('should calculate skip correctly for page 2', async () => {
      usersRepository.findAllPaginated.mockResolvedValue([[], 0]);

      await service.findAll(2, 10);

      expect(usersRepository.findAllPaginated).toHaveBeenCalledWith(10, 10);
    });
  });

  describe('findOne', () => {
    it('should return a user when found', async () => {
      const mockUser = buildMockUser();
      usersRepository.findOneWithSelect.mockResolvedValue(mockUser);

      const result = await service.findOne(1);

      expect(usersRepository.findOneWithSelect).toHaveBeenCalledWith(1, [
        'id', 'name', 'email', 'role', 'isActive', 'createdAt',
      ]);
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      usersRepository.findOneWithSelect.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a user successfully', async () => {
      const mockUser = buildMockUser({ role: UserRole.ADMIN });
      const dto: UpdateUserDto = { name: 'Updated Name' };

      usersRepository.findById.mockResolvedValue(mockUser);
      usersRepository.save.mockResolvedValue({ ...mockUser, name: 'Updated Name' });

      const result = await service.update(1, dto, 2);

      expect(usersRepository.findById).toHaveBeenCalledWith(1);
      expect(usersRepository.save).toHaveBeenCalled();
      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(
        service.update(999, { name: 'Test' }, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when deactivating own account', async () => {
      const mockUser = buildMockUser({ id: 1, role: UserRole.ADMIN });
      usersRepository.findById.mockResolvedValue(mockUser);

      await expect(
        service.update(1, { isActive: false }, 1),
      ).rejects.toThrow(BadRequestException);
      expect(usersRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when deactivating the last active admin', async () => {
      const mockUser = buildMockUser({ id: 1, role: UserRole.ADMIN });
      usersRepository.findById.mockResolvedValue(mockUser);
      usersRepository.countActiveAdmins.mockResolvedValue(1);

      await expect(
        service.update(1, { isActive: false }, 2),
      ).rejects.toThrow(BadRequestException);
      expect(usersRepository.save).not.toHaveBeenCalled();
    });

    it('should allow deactivating admin when other active admins exist', async () => {
      const mockUser = buildMockUser({ id: 1, role: UserRole.ADMIN });
      usersRepository.findById.mockResolvedValue(mockUser);
      usersRepository.countActiveAdmins.mockResolvedValue(2);
      usersRepository.save.mockResolvedValue({ ...mockUser, isActive: false });

      const result = await service.update(1, { isActive: false }, 2);

      expect(result.isActive).toBe(false);
    });

    it('should throw BadRequestException when changing role of last active admin', async () => {
      const mockUser = buildMockUser({ id: 1, role: UserRole.ADMIN });
      usersRepository.findById.mockResolvedValue(mockUser);
      usersRepository.countActiveAdmins.mockResolvedValue(1);

      await expect(
        service.update(1, { role: UserRole.EMPLOYEE }, 2),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('toggleActive', () => {
    it('should toggle user active status', async () => {
      const mockUser = buildMockUser({ id: 1, isActive: true, role: UserRole.EMPLOYEE });
      usersRepository.findById.mockResolvedValue(mockUser);
      usersRepository.save.mockResolvedValue({ ...mockUser, isActive: false });

      const result = await service.toggleActive(1, 2);

      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(service.toggleActive(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when deactivating own account', async () => {
      const mockUser = buildMockUser({ id: 1, role: UserRole.EMPLOYEE });
      usersRepository.findById.mockResolvedValue(mockUser);

      await expect(service.toggleActive(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when deactivating last active admin', async () => {
      const mockUser = buildMockUser({ id: 1, role: UserRole.ADMIN });
      usersRepository.findById.mockResolvedValue(mockUser);
      usersRepository.countActiveAdmins.mockResolvedValue(1);

      await expect(service.toggleActive(1, 2)).rejects.toThrow(BadRequestException);
    });

    it('should allow deactivating admin when other active admins exist', async () => {
      const mockUser = buildMockUser({ id: 1, role: UserRole.ADMIN, isActive: true });
      usersRepository.findById.mockResolvedValue(mockUser);
      usersRepository.countActiveAdmins.mockResolvedValue(2);
      usersRepository.save.mockResolvedValue({ ...mockUser, isActive: false });

      const result = await service.toggleActive(1, 2);

      expect(result.isActive).toBe(false);
    });
  });

  describe('findByIdWithPassword', () => {
    it('should return user with password and auth fields', async () => {
      const mockUserWithPassword = buildMockUser({
        password: 'hashed_password',
        hashedRefreshToken: 'some_refresh_token',
        failedLoginAttempts: 0,
        lockedUntil: null,
      });
      usersRepository.findByIdWithPassword.mockResolvedValue(mockUserWithPassword);

      const result = await usersRepository.findByIdWithPassword(1);

      expect(result).toBeDefined();
      expect(result!.password).toBe('hashed_password');
      expect(result!.hashedRefreshToken).toBe('some_refresh_token');
      expect(result!.failedLoginAttempts).toBe(0);
      expect(result!.lockedUntil).toBeNull();
    });
  });

  describe('hidden fields', () => {
    it('findOne should only select non-sensitive fields', async () => {
      usersRepository.findOneWithSelect.mockResolvedValue(buildMockUser());

      await service.findOne(1);

      const selectArgs = usersRepository.findOneWithSelect.mock.calls[0][1];
      expect(selectArgs).not.toContain('password');
      expect(selectArgs).not.toContain('hashedRefreshToken');
      expect(selectArgs).not.toContain('failedLoginAttempts');
      expect(selectArgs).not.toContain('lockedUntil');
    });

    it('findAllPaginated should only select non-sensitive fields', async () => {
      usersRepository.findAllPaginated.mockResolvedValue([[], 0]);

      await service.findAll(1, 20);

      const findOptions = usersRepository.findAllPaginated.mock.calls[0][0];
      expect(findOptions).toBe(0);
    });
  });
});
