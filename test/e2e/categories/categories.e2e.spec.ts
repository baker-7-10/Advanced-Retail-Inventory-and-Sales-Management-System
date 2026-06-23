import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication, ValidationPipe, UnauthorizedException, ConflictException,
} from '@nestjs/common';
import * as request from 'supertest';
import { CategoriesController } from '../../../src/categories/categories.controller';
import { CategoriesService } from '../../../src/categories/categories.service';
import { JwtAuthGuard } from '../../../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../src/common/guards/roles.guard';

function buildMockService(): jest.Mocked<CategoriesService> {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
  } as unknown as jest.Mocked<CategoriesService>;
}

async function createApp(
  mockService: jest.Mocked<CategoriesService>,
  allowAll = true,
): Promise<INestApplication> {
  const moduleBuilder = Test.createTestingModule({
    controllers: [CategoriesController],
    providers: [{ provide: CategoriesService, useValue: mockService }],
  });

  if (allowAll) {
    moduleBuilder.overrideGuard(JwtAuthGuard).useValue({
      canActivate: (ctx: any) => {
        const req = ctx.switchToHttp().getRequest();
        req.user = { id: 1, email: 'admin@store.com', role: 'ADMIN' };
        return true;
      },
    });
    moduleBuilder.overrideGuard(RolesGuard).useValue({ canActivate: () => true });
  }

  const module = await moduleBuilder.compile();
  const app = module.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.init();
  return app;
}

const mockCategory = {
  id: 1,
  name: 'Electronics',
  description: 'Devices',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const mockPaginated = {
  data: [mockCategory],
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
} as any;

describe('Categories (e2e)', () => {
  let app: INestApplication;
  let mockService: jest.Mocked<CategoriesService>;

  beforeEach(async () => {
    mockService = buildMockService();
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  // --- Authorization ---

  describe('Authorization', () => {
    it('should return 401 when not authenticated', async () => {
      const moduleBuilder = Test.createTestingModule({
        controllers: [CategoriesController],
        providers: [{ provide: CategoriesService, useValue: mockService }],
      });

      moduleBuilder.overrideGuard(JwtAuthGuard).useValue({
        canActivate: () => { throw new UnauthorizedException(); },
      });
      moduleBuilder.overrideGuard(RolesGuard).useValue({ canActivate: () => true });

      const module = await moduleBuilder.compile();
      app = module.createNestApplication();
      await app.init();

      await request(app.getHttpServer())
        .get('/categories')
        .expect(401);
    });

    it('should return 403 for forbidden role', async () => {
      const moduleBuilder = Test.createTestingModule({
        controllers: [CategoriesController],
        providers: [{ provide: CategoriesService, useValue: mockService }],
      });

      moduleBuilder.overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true });
      moduleBuilder.overrideGuard(RolesGuard).useValue({ canActivate: () => false });

      const module = await moduleBuilder.compile();
      app = module.createNestApplication();
      await app.init();

      await request(app.getHttpServer())
        .get('/categories')
        .expect(403);
    });
  });

  // --- Create ---

  describe('POST /categories', () => {
    it('should return 201 on success', async () => {
      app = await createApp(mockService);
      mockService.create.mockResolvedValue(mockCategory as any);

      const res = await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'Electronics', description: 'Devices' })
        .expect(201);

      expect(res.body).toBeDefined();
    });

    it('should return 400 with empty name', async () => {
      app = await createApp(mockService);

      await request(app.getHttpServer())
        .post('/categories')
        .send({ name: '', description: 'Devices' })
        .expect(400);
    });

    it('should return 400 with missing name', async () => {
      app = await createApp(mockService);

      await request(app.getHttpServer())
        .post('/categories')
        .send({ description: 'Devices' })
        .expect(400);
    });

    it('should return 400 with name exceeding max length', async () => {
      app = await createApp(mockService);

      await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'A'.repeat(101) })
        .expect(400);
    });

    it('should return 409 on duplicate name', async () => {
      app = await createApp(mockService);
      mockService.create.mockRejectedValue(new ConflictException('Category already exists'));

      await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'Electronics' })
        .expect(409);
    });
  });

  // --- Get All ---

  describe('GET /categories', () => {
    it('should return 200 with paginated results', async () => {
      app = await createApp(mockService);
      mockService.findAll.mockResolvedValue(mockPaginated);

      const res = await request(app.getHttpServer())
        .get('/categories')
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('should support search query', async () => {
      app = await createApp(mockService);
      mockService.findAll.mockResolvedValue(mockPaginated);

      await request(app.getHttpServer())
        .get('/categories?search=Electronics')
        .expect(200);
    });

    it('should support pagination params', async () => {
      app = await createApp(mockService);
      mockService.findAll.mockResolvedValue({ data: [], meta: { page: 2, limit: 5, total: 0, totalPages: 0 } } as any);

      await request(app.getHttpServer())
        .get('/categories?page=2&limit=5')
        .expect(200);
    });

    it('should return 400 with negative page', async () => {
      app = await createApp(mockService);

      await request(app.getHttpServer())
        .get('/categories?page=-1')
        .expect(400);
    });

    it('should return 400 with limit exceeding max', async () => {
      app = await createApp(mockService);

      await request(app.getHttpServer())
        .get('/categories?limit=200')
        .expect(400);
    });
  });

  // --- Get By ID ---

  describe('GET /categories/:id', () => {
    it('should return 200 when found', async () => {
      app = await createApp(mockService);
      mockService.findOne.mockResolvedValue(mockCategory as any);

      const res = await request(app.getHttpServer())
        .get('/categories/1')
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('should return 400 with non-numeric ID', async () => {
      app = await createApp(mockService);

      await request(app.getHttpServer())
        .get('/categories/abc')
        .expect(400);
    });
  });

  // --- Update ---

  describe('PATCH /categories/:id', () => {
    it('should return 200 on success', async () => {
      app = await createApp(mockService);
      mockService.update.mockResolvedValue({ ...mockCategory, name: 'Computers' } as any);

      const res = await request(app.getHttpServer())
        .patch('/categories/1')
        .send({ name: 'Computers' })
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('should return 400 with invalid body', async () => {
      app = await createApp(mockService);

      await request(app.getHttpServer())
        .patch('/categories/1')
        .send({ name: 123 })
        .expect(400);
    });

    it('should return 200 with partial update (description only)', async () => {
      app = await createApp(mockService);
      mockService.update.mockResolvedValue({ ...mockCategory, description: 'New desc' } as any);

      await request(app.getHttpServer())
        .patch('/categories/1')
        .send({ description: 'New desc' })
        .expect(200);
    });
  });

  // --- Delete ---

  describe('DELETE /categories/:id', () => {
    it('should return 204 on success', async () => {
      app = await createApp(mockService);
      mockService.deactivate.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/categories/1')
        .expect(204);
    });

    it('should return 400 with non-numeric ID', async () => {
      app = await createApp(mockService);

      await request(app.getHttpServer())
        .delete('/categories/abc')
        .expect(400);
    });
  });
});
