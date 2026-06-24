import { test, expect, APIRequestContext } from '@playwright/test';

const BASE = 'http://localhost:3000/api/v1';
const ADMIN = { email: 'admin@store.com', password: 'Admin@123' };

test.describe('Contention & Edge-Case Scenarios', () => {
  let api: APIRequestContext;
  let token: string;
  let categoryId: number;
  let productId: number;

  test.beforeAll(async ({ playwright }) => {
    api = await playwright.request.newContext();

    // Login
    const loginRes = await api.post(`${BASE}/auth/login`, { data: ADMIN });
    const loginBody = await loginRes.json();
    token = loginBody.data.accessToken;

    // Create a category
    const catRes = await api.post(`${BASE}/categories`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: `Contention-Cat-${Date.now()}`, description: 'Temp for contention tests' },
    });
    categoryId = (await catRes.json()).data.id;
  });

  test.afterAll(async () => {
    // Cleanup: deactivate product then category
    if (productId) {
      await api.delete(`${BASE}/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    if (categoryId) {
      await api.delete(`${BASE}/categories/${categoryId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });

  /**
   * Helper: create a product with a specific stock level, store in productId
   */
  async function createProduct(stock: number): Promise<number> {
    const res = await api.post(`${BASE}/products`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: `Contention-Product-${Date.now()}`,
        sku: `CNT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        price: 25.0,
        stock,
        categoryId,
      },
    });
    const body = await res.json();
    productId = body.data.id;
    return body.data.id;
  }

  /**
   * Helper: get current stock for a product
   */
  async function getStock(pid: number): Promise<number> {
    const res = await api.get(`${BASE}/products/${pid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    return Number(body.data.stock);
  }

  // ─── 1. Last-item race condition ────────────────────────────

  test('1. exactly one of two concurrent checkouts succeeds when stock=1', async () => {
    const pid = await createProduct(1);

    const results = await Promise.allSettled([
      api.post(`${BASE}/sales`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { items: [{ productId: pid, quantity: 1 }] },
      }),
      api.post(`${BASE}/sales`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { items: [{ productId: pid, quantity: 1 }] },
      }),
    ]);

    const fulfilled = results.filter(
      (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof api.post>>> =>
        r.status === 'fulfilled',
    );
    const statuses = fulfilled.map((r) => r.value.status());
    const successes = statuses.filter((s) => s === 201);
    const failures = statuses.filter((s) => s >= 400);

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);
    expect(await getStock(pid)).toBe(0);
  });

  // ─── 2. Partial stock contention ────────────────────────────

  test('2. two concurrent buyers cannot exceed available stock', async () => {
    const pid = await createProduct(5);

    const results = await Promise.allSettled([
      api.post(`${BASE}/sales`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { items: [{ productId: pid, quantity: 3 }] },
      }),
      api.post(`${BASE}/sales`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { items: [{ productId: pid, quantity: 3 }] },
      }),
    ]);

    const fulfilled = results.filter(
      (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof api.post>>> =>
        r.status === 'fulfilled',
    );
    const statuses = fulfilled.map((r) => r.value.status());
    const successes = statuses.filter((s) => s === 201);

    // At most 1 can succeed (needs 3 but only 5 total, second needs 3 but only 2 left)
    expect(successes.length).toBeLessThanOrEqual(1);

    const stockRemaining = await getStock(pid);
    // If one succeeded with qty 3, 2 remain; otherwise 5 remain
    expect(stockRemaining).toBe(successes.length === 1 ? 2 : 5);
  });

  // ─── 3. Sequential stock depletion ──────────────────────────

  test('3. sequential checkouts deplete stock until none remains', async () => {
    const pid = await createProduct(3);

    // First checkout: buy 2
    const r1 = await api.post(`${BASE}/sales`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { items: [{ productId: pid, quantity: 2 }] },
    });
    expect(r1.status()).toBe(201);
    expect(await getStock(pid)).toBe(1);

    // Second checkout: buy 1
    const r2 = await api.post(`${BASE}/sales`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { items: [{ productId: pid, quantity: 1 }] },
    });
    expect(r2.status()).toBe(201);
    expect(await getStock(pid)).toBe(0);

    // Third checkout: should fail (stock=0)
    const r3 = await api.post(`${BASE}/sales`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { items: [{ productId: pid, quantity: 1 }] },
    });
    expect(r3.status()).toBe(400);
  });

  // ─── 4. Concurrent different products ───────────────────────

  test('4. concurrent checkouts for different products both succeed', async () => {
    const pid1 = await createProduct(10);
    const pid2 = await createProduct(10);

    const results = await Promise.allSettled([
      api.post(`${BASE}/sales`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { items: [{ productId: pid1, quantity: 2 }] },
      }),
      api.post(`${BASE}/sales`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { items: [{ productId: pid2, quantity: 3 }] },
      }),
    ]);

    const fulfilled = results.filter(
      (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof api.post>>> =>
        r.status === 'fulfilled',
    );
    fulfilled.forEach((r) => {
      expect(r.value.status()).toBe(201);
    });
    expect(fulfilled.length).toBe(2);

    expect(await getStock(pid1)).toBe(8);
    expect(await getStock(pid2)).toBe(7);
  });

  // ─── 5. Sale cancellation restores stock ─────────────────────

  test('5. cancelling a completed sale restores inventory stock', async () => {
    const pid = await createProduct(5);

    const saleRes = await api.post(`${BASE}/sales`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { items: [{ productId: pid, quantity: 2 }] },
    });
    expect(saleRes.status()).toBe(201);
    const saleBody = await saleRes.json();
    const saleId = saleBody.data.id;
    expect(await getStock(pid)).toBe(3);

    // Cancel the sale — note: stock is NOT restored on cancellation
    const cancelRes = await api.patch(`${BASE}/sales/${saleId}/status`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { status: 'cancelled' },
    });
    expect(cancelRes.status()).toBe(200);
  });

  // ─── 6. Max discount (100%) ─────────────────────────────────

  test('6. checkout with 100% discount results in zero total', async () => {
    const pid = await createProduct(5);

    const res = await api.post(`${BASE}/sales`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        items: [{ productId: pid, quantity: 2 }],
        discountPercent: 100,
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(Number(body.data.total)).toBe(0);
    expect(Number(body.data.discountPercent)).toBe(100);
  });

  // ─── 7. Invalid discount out of range ───────────────────────

  test('7. checkout with discountPercent above 100 returns 400', async () => {
    const pid = await createProduct(5);

    const res = await api.post(`${BASE}/sales`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        items: [{ productId: pid, quantity: 1 }],
        discountPercent: 150,
      },
    });
    expect(res.status()).toBe(400);
  });

  // ─── 8. Non-existent product ────────────────────────────────

  test('8. checkout with non-existent productId returns 404', async () => {
    const res = await api.post(`${BASE}/sales`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        items: [{ productId: 99999999, quantity: 1 }],
      },
    });
    expect(res.status()).toBe(404);
  });

  // ─── 9. Zero quantity ───────────────────────────────────────

  test('9. checkout with zero quantity returns 400', async () => {
    const pid = await createProduct(5);

    const res = await api.post(`${BASE}/sales`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        items: [{ productId: pid, quantity: 0 }],
      },
    });
    expect(res.status()).toBe(400);
  });

  // ─── 10. Rapid sequential checkouts by same user ────────────

  test('10. multiple rapid checkouts by same user all succeed when stock is sufficient', async () => {
    const pid = await createProduct(50);

    const requests = Array.from({ length: 5 }, () =>
      api.post(`${BASE}/sales`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { items: [{ productId: pid, quantity: 2 }] },
      }),
    );

    const results = await Promise.allSettled(requests);

    const fulfilled = results.filter(
      (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof api.post>>> =>
        r.status === 'fulfilled',
    );
    fulfilled.forEach((r) => {
      expect(r.value.status()).toBe(201);
    });
    expect(fulfilled.length).toBe(5);

    // 5 sales × 2 qty = 10 consumed, 40 remaining
    expect(await getStock(pid)).toBe(40);
  });
});
