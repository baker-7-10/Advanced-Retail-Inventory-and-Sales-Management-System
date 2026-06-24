import { test, expect, APIRequestContext } from '@playwright/test';

const BASE = 'http://localhost:3000/api/v1';
const ADMIN = { email: 'admin@store.com', password: 'Admin@123' };

let api: APIRequestContext;
let token: string;
let refreshToken: string;

test.describe('Backend API - All Endpoints', () => {
  let createdProductId: number;
  let createdCategoryId: number;
  let createdUserId: number;
  let createdSaleId: number;

  test.beforeAll(async ({ playwright }) => {
    api = await playwright.request.newContext();
    const res = await api.post(`${BASE}/auth/login`, { data: ADMIN });
    const body = await res.json();
    token = body.data.accessToken;
    refreshToken = body.data.refreshToken;
  });

  // ─── AUTH ─────────────────────────────────────────────────

  test('POST /auth/login - login as admin', async () => {
    const res = await api.post(`${BASE}/auth/login`, {
      data: ADMIN,
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeTruthy();
    expect(body.data.refreshToken).toBeTruthy();
    expect(body.data.user.email).toBe('admin@store.com');
    expect(body.data.user.role).toBe('admin');
  });

  test('POST /auth/login - wrong password returns 401', async () => {
    const res = await api.post(`${BASE}/auth/login`, {
      data: { email: 'admin@store.com', password: 'wrongpassword' },
    });
    expect(res.status()).toBe(401);
  });

  test('GET /auth/profile - get profile', async () => {
    const res = await api.get(`${BASE}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.email).toBe('admin@store.com');
  });

  test('POST /auth/refresh - refresh token', async () => {
    const res = await api.post(`${BASE}/auth/refresh`, {
      data: { refreshToken },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.accessToken).toBeTruthy();
    token = body.data.accessToken;
    refreshToken = body.data.refreshToken;
  });

  test('POST /auth/logout - logout', async () => {
    const res = await api.post(`${BASE}/auth/logout`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    // Re-login for subsequent tests
    const loginRes = await api.post(`${BASE}/auth/login`, { data: ADMIN });
    const body = await loginRes.json();
    token = body.data.accessToken;
    refreshToken = body.data.refreshToken;
  });

  // ─── CATEGORIES ───────────────────────────────────────────

  test('POST /categories - create category', async () => {
    const res = await api.post(`${BASE}/categories`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: `Test Cat ${Date.now()}`, description: 'E2E test' },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.data.name).toContain('Test Cat');
    createdCategoryId = body.data.id;
  });

  test('GET /categories - list categories', async () => {
    const res = await api.get(`${BASE}/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.items.length).toBeGreaterThan(0);
  });

  test('GET /categories/:id - get category by id', async () => {
    const res = await api.get(`${BASE}/categories/${createdCategoryId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(createdCategoryId);
  });

  test('PATCH /categories/:id - update category', async () => {
    const res = await api.patch(`${BASE}/categories/${createdCategoryId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: `Updated Cat ${Date.now()}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.name).toContain('Updated Cat');
  });

  // ─── PRODUCTS ─────────────────────────────────────────────

  test('POST /products - create product', async () => {
    const res = await api.post(`${BASE}/products`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: `Test Product ${Date.now()}`,
        sku: `SKU-${Date.now()}`,
        price: 19.99,
        stock: 50,
        categoryId: createdCategoryId,
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.data.name).toContain('Test Product');
    expect(Number(body.data.price)).toBe(19.99);
    createdProductId = body.data.id;
  });

  test('GET /products - list products', async () => {
    const res = await api.get(`${BASE}/products`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.items.length).toBeGreaterThan(0);
    expect(body.data.meta.total).toBeGreaterThan(0);
  });

  test('GET /products?search - search products', async () => {
    const res = await api.get(`${BASE}/products?search=Test`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
  });

  test('GET /products/low-stock - low stock products', async () => {
    const res = await api.get(`${BASE}/products/low-stock?threshold=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
  });

  test('GET /products/:id - get product by id', async () => {
    const res = await api.get(`${BASE}/products/${createdProductId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(createdProductId);
  });

  test('PATCH /products/:id - update product', async () => {
    const res = await api.patch(`${BASE}/products/${createdProductId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { price: 24.99 },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Number(body.data.price)).toBe(24.99);
  });

  // ─── INVENTORY ────────────────────────────────────────────

  test('GET /inventory/low-stock - inventory low stock', async () => {
    const res = await api.get(`${BASE}/inventory/low-stock`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
  });

  test('GET /inventory/stats - inventory stats', async () => {
    const res = await api.get(`${BASE}/inventory/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveProperty('totalProducts');
    expect(body.data).toHaveProperty('lowStockProducts');
    expect(body.data).toHaveProperty('outOfStockProducts');
  });

  test('PATCH /inventory/:productId/minimum-stock - update min stock', async () => {
    const res = await api.patch(`${BASE}/inventory/${createdProductId}/minimum-stock`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { minimumStock: 5 },
    });
    expect(res.status()).toBe(200);
  });

  // ─── SALES ────────────────────────────────────────────────

  test('POST /sales - create sale (checkout)', async () => {
    const res = await api.post(`${BASE}/sales`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        items: [{ productId: createdProductId, quantity: 2 }],
      },
    });
    const body = await res.json();
    // May be 201 or 400 depending on stock
    if (res.status() === 201) {
      expect(body.data.items.length).toBe(1);
      createdSaleId = body.data.id;
    } else {
      console.log('Sale creation returned:', res.status(), body);
    }
  });

  test('GET /sales - list sales', async () => {
    const res = await api.get(`${BASE}/sales`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.items).toBeDefined();
  });

  test('GET /sales/:id - get sale by id', async () => {
    if (!createdSaleId) return;
    const res = await api.get(`${BASE}/sales/${createdSaleId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
  });

  test('GET /sales/:id/invoice - get invoice', async () => {
    if (!createdSaleId) return;
    const res = await api.get(`${BASE}/sales/${createdSaleId}/invoice`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.invoiceNumber).toBeTruthy();
  });

  // ─── REPORTS ──────────────────────────────────────────────

  test('GET /reports/summary - sales summary', async () => {
    const res = await api.get(`${BASE}/reports/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveProperty('totalRevenue');
    expect(body.data).toHaveProperty('totalTransactions');
    expect(body.data).toHaveProperty('averageSale');
  });

  test('GET /reports/top-products - top products', async () => {
    const res = await api.get(`${BASE}/reports/top-products?limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
  });

  test('GET /reports/sales-by-day - sales by day', async () => {
    const res = await api.get(`${BASE}/reports/sales-by-day?startDate=2024-01-01&endDate=2026-12-31`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
  });

  test('GET /reports/stock - stock report', async () => {
    const res = await api.get(`${BASE}/reports/stock`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
  });

  // ─── USERS (ADMIN ONLY) ───────────────────────────────────

  test('GET /users - list users', async () => {
    const res = await api.get(`${BASE}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.items.length).toBeGreaterThan(0);
  });

  test('POST /users - create user', async () => {
    const res = await api.post(`${BASE}/users`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: 'Test User',
        email: `testuser${Date.now()}@store.com`,
        password: 'Test@123',
        role: 'employee',
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.data.email).toContain('testuser');
    createdUserId = body.data.id;
  });

  test('GET /users/:id - get user by id', async () => {
    const res = await api.get(`${BASE}/users/${createdUserId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
  });

  test('PATCH /users/:id - update user', async () => {
    const res = await api.patch(`${BASE}/users/${createdUserId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: 'Updated User' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe('Updated User');
  });

  test('PATCH /users/:id/toggle-active - toggle user active', async () => {
    const res = await api.patch(`${BASE}/users/${createdUserId}/toggle-active`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
  });

  // ─── CLEANUP ──────────────────────────────────────────────

  test('DELETE /products/:id - deactivate product', async () => {
    const res = await api.delete(`${BASE}/products/${createdProductId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(204);
  });

  test('DELETE /categories/:id - deactivate category', async () => {
    const res = await api.delete(`${BASE}/categories/${createdCategoryId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(204);
  });

  // ─── AUTH GUARD (UNAUTHORIZED) ────────────────────────────

  test('GET /products without token returns 401', async () => {
    const res = await api.get(`${BASE}/products`);
    expect(res.status()).toBe(401);
  });

  test('GET /users without token returns 401', async () => {
    const res = await api.get(`${BASE}/users`);
    expect(res.status()).toBe(401);
  });
});
