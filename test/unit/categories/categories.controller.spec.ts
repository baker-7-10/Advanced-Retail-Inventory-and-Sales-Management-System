import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from '../../../src/categories/categories.controller';
import { CategoriesService } from '../../../src/categories/categories.service';
import { CreateCategoryDto } from '../../../src/categories/dto/create-category.dto';
import { UpdateCategoryDto } from '../../../src/categories/dto/update-category.dto';
import { CategoryQueryDto } from '../../../src/categories/dto/category-query.dto';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let service: jest.Mocked<CategoriesService>;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
    } as unknown as jest.Mocked<CategoriesService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        { provide: CategoriesService, useValue: service },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with DTO', async () => {
      const dto: CreateCategoryDto = { name: 'Electronics', description: 'Devices' };
      service.create.mockResolvedValue({ id: 1, ...dto, isActive: true } as any);

      const result = await controller.create(dto, { id: 1 } as any);

      expect(service.create).toHaveBeenCalledWith(dto, 1);
      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with query', async () => {
      const query: CategoryQueryDto = { page: 1, limit: 20, search: 'Electronics' };
      service.findAll.mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result.meta.page).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with ID', async () => {
      service.findOne.mockResolvedValue({ id: 1, name: 'Electronics' } as any);

      const result = await controller.findOne(1);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result.name).toBe('Electronics');
    });
  });

  describe('update', () => {
    it('should call service.update with ID and DTO', async () => {
      const dto: UpdateCategoryDto = { name: 'Computers' };
      service.update.mockResolvedValue({ id: 1, name: 'Computers' } as any);

      const result = await controller.update(1, dto, { id: 1 } as any);

      expect(service.update).toHaveBeenCalledWith(1, dto, 1);
      expect(result.name).toBe('Computers');
    });
  });

  describe('deactivate', () => {
    it('should call service.deactivate with ID', async () => {
      service.deactivate.mockResolvedValue(undefined);

      await controller.deactivate(1, { id: 1 } as any);

      expect(service.deactivate).toHaveBeenCalledWith(1, 1);
    });
  });
});
