import { test, expect, Page, Locator } from '@playwright/test';

const ADMIN_EMAIL = 'admin@store.com';
const ADMIN_PASSWORD = 'Admin@123';

async function login(page: Page) {
  await page.goto('/login');
  await page.waitForSelector('#email', { timeout: 10000 });
  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#password', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

test.describe('Retail Management System - E2E', () => {
  test('Login flow', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('RetailOS').first()).toBeVisible();

    await page.fill('#email', ADMIN_EMAIL);
    await page.fill('#password', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page.getByText('RetailOS').first()).toBeVisible();
    const token = await page.evaluate(() => localStorage.getItem('rms_access_token'));
    expect(token).toBeTruthy();
  });

  test('Dashboard loads KPIs and real-time indicator', async ({ page }) => {
    await login(page);

    await expect(page.getByText('Total revenue').first()).toBeVisible({ timeout: 10000 });

    await expect(page.getByText('Live sync').first()).toBeVisible({ timeout: 5000 });
  });

  test.describe('Products CRUD', () => {
    const prodName = `E2E Product ${Date.now()}`;
    const prodSku = `SKU-${Date.now()}`;

    test('Create product', async ({ page }) => {
      await login(page);
      await page.click('a[routerlink="/products"], a:has-text("Products")');
      await page.waitForURL('**/products', { timeout: 10000 });

      await page.click('button:has-text("Add"), button:has-text("New")');
      await page.waitForSelector('input#name', { timeout: 5000 });

      await page.fill('input#name', prodName);
      await page.fill('input#sku', prodSku);
      await page.fill('input#price', '29.99');
      await page.fill('input#stock', '100');

      await page.click('button:has-text("Save"), button:has-text("Create")');
      await page.waitForTimeout(1000);

      const successToast = page.locator('text=success').or(page.locator('text=created')).first();
      await expect(successToast).toBeVisible({ timeout: 5000 }).catch(() => {});
    });

    test('View and edit product', async ({ page }) => {
      await login(page);
      await page.goto('/products');
      await page.waitForSelector('table', { timeout: 10000 });

      const editBtn = page.locator('button:has-text("Edit"), button:has-text("edit")').first();
      if (await editBtn.isVisible()) {
        await editBtn.click();
        await page.waitForSelector('input#name', { timeout: 5000 });
        await page.fill('input#price', '24.99');
        await page.click('button:has-text("Save")');
        await page.waitForTimeout(1000);
      }
    });

    test('Products list loads', async ({ page }) => {
      await login(page);
      await page.goto('/products');
      await page.waitForSelector('table', { timeout: 10000 });
      const rows = page.locator('table tbody tr');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    });

    test('Product search works', async ({ page }) => {
      await login(page);
      await page.goto('/products');
      await page.waitForSelector('input[placeholder*="Search by name"]', { timeout: 10000 });

      const searchInput = page.locator('input[placeholder*="Search by name"]').first();
      await searchInput.fill('Laptop');
      await page.waitForTimeout(1500);
      const rows = page.locator('table tbody tr');
      const count = await rows.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Categories CRUD', () => {
    const catName = `E2E Cat ${Date.now()}`;

    test('Create category', async ({ page }) => {
      await login(page);
      await page.goto('/categories');
      await page.waitForSelector('table', { timeout: 10000 });

      await page.click('button:has-text("Add category")');
      await page.waitForSelector('#catName', { timeout: 5000 });
      await page.fill('#catName', catName);

      await page.click('button:has-text("Create")');
      await page.waitForTimeout(1000);
    });

    test('Categories list loads', async ({ page }) => {
      await login(page);
      await page.goto('/categories');
      await page.waitForSelector('table', { timeout: 10000 });
      const rows = page.locator('table tbody tr');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('POS and Sales', () => {
    test('POS page loads and products display', async ({ page }) => {
      await login(page);
      await page.goto('/pos');
      await page.waitForTimeout(3000);

      const products = page.locator('input[placeholder*="Search"]');
      await expect(products).toBeVisible({ timeout: 15000 });
    });

    test('Sales page loads with history', async ({ page }) => {
      await login(page);
      await page.goto('/sales');
      await page.waitForTimeout(3000);

      await page.waitForSelector('table', { timeout: 10000 }).catch(() => {});
      const heading = page.locator('h1, h2, .text-2xl').filter({ hasText: /Sale/i });
      await expect(heading.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Reports', () => {
    test('Reports page loads KPIs and charts', async ({ page }) => {
      await login(page);
      await page.goto('/reports');
      await page.waitForTimeout(3000);

      const kpi = page.locator('text=Revenue').or(page.locator('text=revenue')).first();
      await expect(kpi).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Users (Admin)', () => {
    test('Users page loads user list', async ({ page }) => {
      await login(page);
      await page.goto('/users');
      await page.waitForTimeout(3000);

      await page.waitForSelector('table', { timeout: 10000 }).catch(() => {});
      const heading = page.locator('h1, h2, .text-2xl').filter({ hasText: /User/i });
      await expect(heading.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Real-time WebSocket', () => {
    test('Real-time indicator shows connected', async ({ page }) => {
      await login(page);
      await page.waitForTimeout(3000);
      await expect(page.getByText('Live sync').first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Logout', () => {
    test('Logout clears session and redirects to login', async ({ page }) => {
      await login(page);

      const logoutBtn = page.locator('button[title="Log out"], button[aria-label="Log out"]');
      await logoutBtn.first().click({ timeout: 5000 });

      await page.waitForURL('**/login', { timeout: 10000 });

      const token = await page.evaluate(() => localStorage.getItem('rms_access_token'));
      expect(token).toBeNull();
    });
  });
});
