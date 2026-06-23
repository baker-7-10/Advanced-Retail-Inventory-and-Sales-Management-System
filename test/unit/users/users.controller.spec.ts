import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../../../src/users/users.controller';
import { UsersService } from '../../../src/users/users.service';
import { CreateUserDto } from '../../../src/users/dto/create-user.dto';
import { UpdateUserDto } from '../../../src/users/dto/update-user.dto';
import { UserRole } from '../../../src/users/entities/user.entity';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  const mockCurrentUser = { id: 1, email: 'admin@store.com', role: UserRole.ADMIN };

  beforeEach(async () => {
    usersService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      toggleActive: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('create', () => {
    it('should call usersService.create with the DTO', async () => {
      const dto: CreateUserDto = {
        name: 'John Doe',
        email: 'john@store.com',
        password: 'password123',
        role: UserRole.EMPLOYEE,
      };
      const mockResult = { id: 1, ...dto, password: 'hashed' } as any;

      usersService.create.mockResolvedValue(mockResult);

      const result = await controller.create(dto, { id: 1 } as any);

      expect(usersService.create).toHaveBeenCalledWith(dto, 1);
      expect(result).toEqual(mockResult);
    });
  });

  describe('findAll', () => {
    it('should call usersService.findAll with pagination defaults', async () => {
      const paginatedResult = {
        data: [],
        meta: { total: 0, page: 1, limit: 20 },
      };

      usersService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll({ page: 1, limit: 20 });

      expect(usersService.findAll).toHaveBeenCalledWith(1, 20);
      expect(result).toEqual(paginatedResult);
    });

    it('should pass custom page and limit', async () => {
      const paginatedResult = {
        data: [],
        meta: { total: 0, page: 2, limit: 10 },
      };

      usersService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll({ page: 2, limit: 10 });

      expect(usersService.findAll).toHaveBeenCalledWith(2, 10);
      expect(result).toEqual(paginatedResult);
    });
  });

  describe('findOne', () => {
    it('should call usersService.findOne with the id', async () => {
      const mockUser = { id: 1, name: 'John Doe', email: 'john@store.com' } as any;
      usersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne(1);

      expect(usersService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUser);
    });
  });

  describe('update', () => {
    it('should call usersService.update with id, dto, and current user id', async () => {
      const dto: UpdateUserDto = { name: 'Updated Name' };
      const mockResult = { id: 1, name: 'Updated Name', email: 'admin@store.com' } as any;

      usersService.update.mockResolvedValue(mockResult);

      const result = await controller.update(1, dto, mockCurrentUser);

      expect(usersService.update).toHaveBeenCalledWith(1, dto, 1);
      expect(result).toEqual(mockResult);
    });
  });

  describe('toggleActive', () => {
    it('should call usersService.toggleActive with id and current user id', async () => {
      const mockResult = { id: 1, isActive: false } as any;
      usersService.toggleActive.mockResolvedValue(mockResult);

      const result = await controller.toggleActive(1, mockCurrentUser);

      expect(usersService.toggleActive).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual(mockResult);
    });
  });
});
