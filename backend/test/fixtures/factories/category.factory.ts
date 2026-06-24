import { Category } from '../../../src/categories/entities/category.entity';

export function buildMockCategory(overrides: Partial<Category> = {}): Category {
  const category = new Category();
  category.id = 1;
  category.name = 'Test Category';
  category.description = 'A test category';
  category.isActive = true;
  category.products = [];
  category.createdAt = new Date();
  category.updatedAt = new Date();
  return Object.assign(category, overrides);
}
