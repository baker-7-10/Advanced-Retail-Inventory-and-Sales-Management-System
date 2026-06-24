# Full Code Review — Advanced Retail Inventory & Sales Management System

---

## A. Executive Summary

| Item | Value |
|---|---|
| **Level** | Conditionally Ready — Not Ready for delivery without fixes |
| **Readiness** | ~65% |
| **Top 5 blocking issues** | (1) WebSocket completely broken — namespace mismatch + event name mismatch. (2) `.env` in the repository with real secrets. (3) `PaymentMethod` exists in Frontend but Backend doesn't store it — data is lost. (4) `categoryId` is not validated against the database — potential Foreign Key Violation. (5) No Seed Data — running the project from scratch requires manually entering data for every table. |

---

## B. Rubric Score

### 1. Code Quality and Structure — **13/20** ✅

**What's good:**
- Excellent modular NestJS architecture (Modules / Controllers / Services / Repositories / DTOs)
- Repository Pattern with EntityManager for transactions
- Angular 19 Standalone Components + Signals with service/component separation
- Custom decorators (`@Roles`, `@CurrentUser`, `@SuccessMessage`)
- Unified pagination utils and Transform Interceptor
- `class-validator` on all DTOs

**Missing:**
- `strictNullChecks: false` and `noImplicitAny: false` weaken Type Safety (`backend/tsconfig.json:55-56`)
- `frontend/src/app/core/models/index.ts` contains `PaymentMethod`, `amountPaid`, and `change` that are never used by the Backend
- `UpdateProductDto` uses `PartialType(CreateProductDto)` making all fields (including `stock`) optional — correct for PATCH but `stock: number` in `CreateProductDto` is required, which can be confusing
- `any` used in several places (`global-exception.filter.ts:23` `as any`)

### 2. Functionality — **20/30** 🔶

**What's good:**
- Full CRUD for products with pagination, filtering, sorting (`products.service.ts` + `products.repository.ts`)
- Sale processing with subtotal/total calculated on Backend + Database Transaction + Pessimistic Locking (`sales.service.ts:47-105`)
- Status transition validation with allowed rules (`sales.service.ts:20-25`)
- Invoice generation with async random UUID (`sales.service.ts:182-186`)
- Inventory management with low-stock detection
- Reports module with summary, top products, daily sales, category sales, stock levels
- JWT authentication + refresh token rotation + account lockout (5 failed → 15m lock)

**Missing:**
- **WebSocket broken**: `InventoryGateway` namespace `/inventory` ← Frontend connects to root. Backend emits `inventory.updated` ← Frontend listens for `stockUpdated | stock:updated | stock_update`. No match.
- **PaymentMethod missing**: `Sale` entity has no `paymentMethod` field — information is lost after checkout
- **categoryId validation missing**: `CreateProductDto` doesn't verify the category exists — MySQL Foreign Key Constraint will prevent insertion but the error will be confusing (QueryFailedError)
- **Cannot create product without valid categoryId** — API will return 500 instead of 400
- **Refund doesn't restore stock** (`updateStatus → REFUNDED` in `sales.service.ts:134-155`)
- **Invoice number too small**: `crypto.randomUUID().split('-')[0]` = only 8 hex chars — collision risk with 50K+ invoices
- **Employee cannot view sales** (`sales.controller.ts:51` `Roles(ADMIN, MANAGER)` only)

### 3. Database Integration — **13/20** 🔶

**What's good:**
- TypeORM Entities with relationships (ManyToOne, OneToMany, OneToOne)
- Foreign Keys with `RESTRICT` on product→category and `CASCADE` on sale→sale_items
- Indexes on `name`, `price`, `sku`, `createdAt`, `status`, `quantity`, `(role, isActive)`
- Unique constraint on `email`, `sku`, `invoiceNumber`, `productId` (inventory)
- Migrations (2 exist)
- Environment variables for DB credentials

**Missing:**
- `synchronize: true` in non-production — prevents effective use of migrations, may cause data loss on error
- No `@Index(['categoryId'])` on Product entity — category queries may be slow
- No `@Index(['productId'])` on SaleItem entity — findTopProducts and findSalesByCategory reports may cause Full Table Scan
- No cascade soft delete: deactivating a product (isActive=false) doesn't affect inventory (orphaned inventory records)
- `data-source.ts` loads `.env` via `dotenv` and not through ConfigService — bypasses NestJS ConfigModule mechanism
- `categoryId` has `@Column({ nullable: false })` and `create-product.dto.ts` has `@IsInt() @IsPositive()` — correct. But no existence check.

### 4. Real-Time Updates — **1/10** ❌

**What's good:**
- `InventoryGateway` (`inventory.gateway.ts`) with namespace `/inventory`
- JWT authentication for WebSocket
- Room-based subscriptions (`inventory-room`, `product-{id}`)
- Frontend `RealtimeService` with auto-reconnect (`realtime.service.ts`)
- Frontend `CartService.syncStock()` (`cart.service.ts:86-99`)

**Missing:**
- **Namespace mismatch**: Gateway on `/inventory`, Frontend connects to `/` (root)
- **Event name mismatch**: Backend sends `inventory.updated`, Frontend listens for `stockUpdated | stock:updated | stock_update`
- **Effectively: WebSocket does not work at all**
- No listener for `transactionCreated` / `sale:created` in Backend — Frontend listens for non-existent events
- Employees cannot connect to WebSocket (`gateway.ts:47` only allows ADMIN/MANAGER)
- No cleanup for product rooms on disconnect

### 5. Performance Optimization — **7/10** 🔶

**What's good:**
- Pagination on all listings
- Debounce on search in Frontend (350ms)
- Indexes on filter columns
- Query builder with where clauses — no full data load
- `@SkipThrottle()` on GET products (design choice)

**Missing:**
- Potential N+1: `Sale.findById` (`sales.repository.ts:17-22`) loads `items`, `items.product`, and `items.product.category` — can be heavy with large sales
- Full-text search uses `LIKE %search%` — without MySQL Full-Text Index this is a Full Table Scan
- No caching (Redis) for frequently accessed data (categories, products list)
- `findTopProducts` and `findSalesByCategory` run `GROUP BY` and `SUM` on entire `sale_items` within date range — can be slow with millions of rows
- `findAllPaginated` in `products.repository.ts:60-121` uses `SelectQueryBuilder` with `leftJoinAndSelect` on `inventory` for every request — performance impact

### 6. User Interface — **6/10** 🔶

**What's good:**
- Tailwind CSS with dark/light mode (CSS variables)
- Standalone Components with OnPush-compatible signals
- Skeleton loading, Empty states, and Error handling
- Responsive design (grid for mobile + desktop cart sidebar)
- Lazy loading routes (Angular 19 feature)
- Pagination UI with Previous/Next
- Modal component with overlay
- Toast notifications

**Missing:**
- **PaymentMethod appears in UI but is not saved** — User selects "Card" or "Cash" but Backend doesn't receive it
- Discount in Checkout is calculated as flat rate (dollars) but Backend expects percentage — approximate conversion may cause minor discrepancies with currencies
- `aria-label` present on some buttons but missing on most
- `<label for="...">` present on most fields — good
- Limited keyboard navigation (tab-index not explicitly set)
- No explicit `trackBy` on `@for` loops (Angular 17+ @for uses automatic tracking but should verify)
- Products component `categoryName` uses Map lookup — good
- No subscription to `transactionCreated$` in any component — event is emitted but no one listens

---

## C. Findings Table

| ID | Severity | Area | Problem | Location | Impact | Fix | Priority |
|---|---|---|---|---|---|---|---|
| F1 | **Critical** | WebSocket | Namespace mismatch: Gateway=`/inventory`, Frontend=`/` | `inventory.gateway.ts:12` ↔ `realtime.service.ts:32` | Real-time completely broken | 1) Remove namespace from Gateway, or 2) Add namespace to Frontend URL | 1 |
| F2 | **Critical** | WebSocket | Event name mismatch: Backend=`inventory.updated`, Frontend=`stockUpdated/stock:updated/stock_update` | `inventory.gateway.ts:68` ↔ `realtime.service.ts:46-53` | Real-time completely broken | Unify event name (choose `stockUpdated` for both) | 1 |
| F3 | **Critical** | Security | `.env` with secrets in repository | `/backend/.env` | Leaked passwords and JWT secrets | Add `.env` to `.gitignore`, remove from git history | 1 |
| F4 | **Critical** | Sales | `paymentMethod` exists in Frontend but not sent to Backend or stored | `frontend:checkout.component.ts` ↔ `backend:sale.entity.ts` | Payment info is lost | Add `paymentMethod` to Sale entity and CreateSaleDto | 1 |
| F5 | **High** | Validation | `categoryId` not validated for existence in DB | `products.service.ts:25-37` | Foreign Key Violation → 500 | Verify category exists before creating product | 2 |
| F6 | **High** | Inventory | Refund doesn't restore stock | `sales.service.ts:144-154` | Overselling after refund | Add stock restore in `updateStatus(REFUNDED)` within transaction | 2 |
| F7 | **High** | Database | `synchronize: true` in dev | `database.config.ts:20` | Data loss risk if run in prod or if entities differ from migrations | Set `synchronize: false` and use migrations only | 2 |
| F8 | **High** | Auth | Employees cannot view sales list | `sales.controller.ts:51` | Employee can't see their sales history | Add `EMPLOYEE` to Roles | 2 |
| F9 | **High** | Seed | No seed data | — | Empty dev environment requires manual entry | Create seed script or migration with base data | 2 |
| F10 | **Medium** | Security | No Helmet or security headers | `main.ts:52-57` | Vulnerable to XSS/Clickjacking/MIME sniffing | Add `helmet` package | 3 |
| F11 | **Medium** | DB | Missing index on `categoryId` in Product | `product.entity.ts` | Category queries slow | Add `@Index()` on `categoryId` | 3 |
| F12 | **Medium** | DB | Missing index on `productId` in SaleItem | `sale-item.entity.ts` | findTopProducts reports slow | Add `@Index()` on `productId` | 3 |
| F13 | **Medium** | Auth | JWT access_token expiry = 1d in `.env` and `.env.example`=15m | `backend/.env:9` | Inconsistency; 1d is too long for security | Unify on 15m | 3 |
| F14 | **Medium** | Invoice | invoice number = 8 hex chars only | `sales.service.ts:184` | Collision with many sales | Use timestamp-based + counter or full UUID | 3 |
| F15 | **Medium** | Frontend | Discount in checkout computed as flat-rate dollars, Backend expects percentage | `checkout.component.ts:116` | Minor discount discrepancy on conversion | Send discount as percentage directly from Frontend | 3 |
| F16 | **Low** | TS Config | `strictNullChecks: false` and `noImplicitAny: false` | `backend/tsconfig.json:55-56` | Weak TypeScript typing | Enable strict mode | 4 |
| F17 | **Low** | WebSocket | Employees cannot connect to Socket | `inventory.gateway.ts:47` | Employee doesn't receive stock updates | Add `EMPLOYEE` to allowedRoles or open Socket | 4 |
| F18 | **Low** | Test | Concurrent sales test relies entirely on mocks, not real DB | `concurrent-sales.e2e.spec.ts` | Doesn't actually test pessimistic locking | Use testcontainers or MySQL test instance | 4 |

---

## D. Feature Verification Checklist

| # | Requirement | Status | Evidence | Notes |
|---|---|---|---|---|
| 1.1 | Create product | ✅ Pass | `products.controller.ts:35-45`, `products.service.ts:24-42` | SKU uniqueness check + transaction with inventory |
| 1.2 | List products | ✅ Pass | `products.controller.ts:47-64`, `products.repository.ts:60-122` | Complete pagination, filtering, sorting |
| 1.3 | Update product | ✅ Pass | `products.controller.ts:85-100`, `products.service.ts:52-75` | PATCH with optional stock update |
| 1.4 | Delete product | ⚠️ Partial | `products.controller.ts:102-112`, `products.service.ts:77-81` | Soft delete only (isActive=false) — not actual deletion |
| 1.5 | Basic fields | ✅ Pass | `product.entity.ts` | name, price, stock (virtual), category, sku present |
| 1.6 | Validation (name) | ✅ Pass | `create-product.dto.ts:8-12` | `@IsString @MinLength(2) @MaxLength(200)` |
| 1.7 | Validation (price) | ✅ Pass | `create-product.dto.ts:19-22` | `@IsNumber @IsPositive` |
| 1.8 | Validation (stock) | ✅ Pass | `create-product.dto.ts:24-27` | `@IsInt @Min(0)` |
| 1.9 | Validation (category) | ❌ Fail | `create-product.dto.ts:29-32` | `@IsInt @IsPositive` present but no DB existence check |
| 1.10 | Prevent duplication | ✅ Pass | `products.service.ts:25-30, 55-60` | SKU unique check |
| 1.11 | Clear error messages | ✅ Pass | All services | Clear messages with product name and values |
| 2.1 | Search by name | ✅ Pass | `products.repository.ts:74-78` | LIKE %search% |
| 2.2 | Full-text search | ❌ Fail | `products.repository.ts:74-78` | LIKE %search% without MySQL Full-Text Index |
| 2.3 | Filter by category | ✅ Pass | `products.repository.ts:81-83` | categoryId filter |
| 2.4 | Filter by price range | ✅ Pass | `products.repository.ts:85-90` | minPrice + maxPrice |
| 2.5 | Multiple filters together | ✅ Pass | `products.repository.ts:60-121` | All filters applied together |
| 2.6 | Pagination | ✅ Pass | `products.repository.ts:106-107` | skip/take with meta data |
| 2.7 | Sorting | ✅ Pass | `products.repository.ts:96-104` | name, price, stock, createdAt |
| 2.8 | Don't load all data | ✅ Pass | Query builder with pagination | — |
| 2.9 | SQL injection protection | ✅ Pass | QueryBuilder parameterized queries | — |
| 3.1 | Add products to cart | ✅ Pass | `cart.service.ts:40-53` | With stock check |
| 3.2 | Modify quantities and delete | ✅ Pass | `cart.service.ts:55-78` | increment, decrement, remove |
| 3.3 | Calculate subtotal/total | ✅ Pass | `cart.service.ts:24-32` | computed signals |
| 3.4 | Prevent selling more than stock | ✅ Pass | `sales.service.ts:67-71`, `cart.service.ts:45,60` | Both Frontend and Backend |
| 3.5 | Prevent selling deleted product | ✅ Pass | `sales.service.ts:63-65` | `product.isActive` check |
| 3.6 | Update stock after sale | ✅ Pass | `sales.service.ts:100-102` | Within transaction |
| 3.7 | Sales Transaction with items | ✅ Pass | `sale.entity.ts`, `sale-item.entity.ts` | unitPrice saved at time of sale |
| 3.8 | Invoice | ✅ Pass | `sales.service.ts:157-180` | Invoice endpoint with full details |
| 3.9 | Database Transaction | ✅ Pass | `sales.service.ts:47-105` | `dataSource.transaction()` |
| 3.10 | Concurrent protection | ✅ Pass | `inventory.repository.ts:21-26` | pessimistic_write lock |
| 3.11 | Don't trust Frontend prices | ✅ Pass | `sales.service.ts:73-81` | Backend calculates unitPrice from DB |
| 4.1 | Entities | ✅ Pass | All entities/ folders | — |
| 4.2 | Migrations | ⚠️ Partial | `database/migrations/` | Only 2 with synchronize=true — not in sync with entities |
| 4.3 | Relationships | ✅ Pass | Product→Category (M:1), Product→Inventory (1:1), Sale→User (M:1), Sale→SaleItem (1:M) | — |
| 4.4 | Product deletion impact on sales | ✅ Pass | `product.entity.ts:40` | `RESTRICT` on category; soft delete doesn't affect sale_items |
| 4.5 | Sale prices preserved | ✅ Pass | `sale-item.entity.ts:31-35` | `unitPrice` stores price at sale time |
| 4.6 | N+1 queries | ⚠️ Partial | `sales.repository.ts:17-22` | Loads all items + product + category in one go — but can be heavy |
| 4.7 | Indexes | ⚠️ Partial | entities | Missing `categoryId` in Product and `productId` in SaleItem |
| 4.8 | Secrets outside code | ❌ Fail | `.env` in repo | + real `ACCESS_TOKEN_SECRET` exposed |
| 4.9 | Seed data | ❌ Fail | — | Does not exist |
| 5.1 | Login | ✅ Pass | `auth.controller.ts:28-48` | Throttled (5/min), account lockout |
| 5.2 | JWT | ✅ Pass | `auth.module.ts:16-23` | Access + Refresh token |
| 5.3 | Protect endpoints | ✅ Pass | `jwt-auth.guard.ts` + `roles.guard.ts` | — |
| 5.4 | Roles | ✅ Pass | `user.entity.ts:8-12` | ADMIN, MANAGER, EMPLOYEE |
| 5.5 | Manager only manages products | ✅ Pass | `products.controller.ts:36` | `Roles(ADMIN, MANAGER)` |
| 5.6 | Employee can sell | ✅ Pass | `sales.controller.ts:39` | `Roles(ADMIN, MANAGER, EMPLOYEE)` |
| 5.7 | Prevent privilege escalation | ✅ Pass | `roles.guard.ts:23` | ADMIN bypasses role check |
| 5.8 | Don't leak passwords | ✅ Pass | `user.entity.ts:27` | `@Exclude()` + `select: false` |
| 5.9 | Secure hashing | ✅ Pass | `auth.service.ts:40,75` | bcrypt with 10 rounds |
| 5.10 | CORS | ✅ Pass | `main.ts:52-57` | Restricted to `FRONTEND_URL` |
| 5.11 | Rate limiting | ✅ Pass | `app.module.ts:27-32` + Throttle decorators | Global + specific |
| 6.1 | Real-time stock update after sale | ❌ Fail | gateway.ts ↔ realtime.service.ts | Broken — namespace + event mismatch |
| 6.2 | WebSocket/Socket.IO | ⚠️ Partial | Code exists but doesn't work | — |
| 6.3 | Clear event names | ❌ Fail | `inventory.updated` vs `stockUpdated/stock:updated/stock_update` | Incompatible |
| 6.4 | Memory leaks | ⚠️ Partial | `products.component.ts:229-232`, `pos.component.ts:273-276` | `takeUntil(destroy$)` present — good |
| 6.5 | Reconnect | ✅ Pass | `realtime.service.ts:36-39` | `reconnection: true, attempts: Infinity` |
| 6.6 | Don't send sensitive data | ✅ Pass | `inventory.gateway.ts:68-74` | Only productId + quantity |
| 7.1 | Angular organization | ✅ Pass | app/core/features/shared/layout | — |
| 7.2 | Business logic separation | ✅ Pass | services with components | — |
| 7.3 | Routing and protection | ✅ Pass | `app.routes.ts` + `auth.guard.ts` | authGuard + guestGuard + lazy loading |
| 7.4 | Forms + validation | ✅ Pass | `product-form.component.ts` | Reactive Forms + Validators |
| 7.5 | Loading/Error/Empty states | ✅ Pass | `products.component.ts:77-95`, `pos.component.ts:45-56` | — |
| 7.6 | Responsive design | ✅ Pass | Tailwind CSS grid + mobile/desktop layouts | — |
| 7.7 | Accessibility | ⚠️ Partial | Some `aria-label` present but not all buttons | — |
| 7.8 | XSS prevention | ✅ Pass | Angular template binding (safe by default) | — |
| 7.9 | Pagination + debounce | ✅ Pass | `products.component.ts:216` | 350ms debounce + distinctUntilChanged |
| 8.1 | Modules / Controllers / Services | ✅ Pass | Complete NestJS architecture | — |
| 8.2 | DTO validation | ✅ Pass | class-validator on all DTOs | — |
| 8.3 | REST conventions | ✅ Pass | PATCH for updates, DELETE for deletion, POST for creation | — |
| 8.4 | Unified response format | ✅ Pass | `transform.interceptor.ts` + `global-exception.filter.ts` | `{ success, message, data }` |
| 8.5 | Logging | ⚠️ Partial | Logger only — no structured logging | — |
| 8.6 | Unexpected error handling | ⚠️ Partial | `global-exception.filter.ts` catches QueryFailedError and returns 400 | QueryFailedError is not always 400 |
| 8.7 | Swagger | ✅ Pass | `main.ts:75-116` | Complete + extraModels |
| 9.1 | Dockerfile | ✅ Pass | Both Backend and Frontend multi-stage | — |
| 9.2 | docker-compose | ✅ Pass | DB + Backend + Frontend with healthcheck + networks | — |
| 9.3 | Health checks | ✅ Pass | MySQL healthcheck | — |
| 9.4 | Volumes | ✅ Pass | mysql_data | — |
| 9.5 | .env.example | ✅ Pass | `backend/.env.example` | — |
| 9.6 | Secrets in Dockerfile | ✅ Pass | None | — |
| 9.7 | Production build | ✅ Pass | Multi-stage, production dependencies only | — |
| 9.8 | Image size | ✅ Pass | Alpine + multi-stage | — |
| 9.9 | Setup instructions | ✅ Pass | README.md with clear commands | — |
| 10.1 | Unit tests | ✅ Pass | 20+ test files in test/unit/ | — |
| 10.2 | E2E tests | ✅ Pass | 6+ test files in test/e2e/ | — |
| 10.3 | Product CRUD scenario | ✅ Pass | products e2e tests | — |
| 10.4 | Successful sale | ✅ Pass | sales e2e tests | — |
| 10.5 | Sale exceeding stock | ✅ Pass | sales e2e tests | — |
| 10.6 | Concurrent sales test | ⚠️ Partial | `concurrent-sales.e2e.spec.ts` | Fully dependent on mocks, not real DB |
| 10.7 | Linting | ✅ Pass | ESLint with CI | — |
| 10.8 | Professional README | ⚠️ Partial | `README.md` is basic — missing Architecture overview, API endpoints list, assumptions | — |

---

## E. Security Review

| Vulnerability | Status | Details |
|---|---|---|
| **Authorization bypass** | ✅ Safe | RolesGuard prevents unauthorized access. Admin bypass is correct. |
| **Input validation** | ✅ Safe (with caveat) | class-validator on all DTOs. But `categoryId` not checked for existence. |
| **SQL injection** | ✅ Safe | QueryBuilder with parameterized queries everywhere. |
| **XSS** | ✅ Safe | Angular template binding + no innerHTML |
| **JWT handling** | ⚠️ Warning | Access token 1d in `.env` is too long. Refresh token rotation is correct. |
| **Password storage** | ✅ Safe | bcrypt 10 rounds + `select: false` |
| **CORS** | ✅ Safe | Restricted to `FRONTEND_URL` only |
| **Secrets exposure** | ❌ **Vulnerability** | `.env` in repo with `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, and DB passwords |
| **Rate limiting** | ✅ Safe | Global + specific throttling (login: 5/min, sales: 30/min) |
| **Sensitive data in logs** | ✅ Safe | Logger doesn't print passwords or tokens |
| **Security headers** | ❌ **Vulnerability** | No HelmetJS — no CSP, X-Frame-Options, X-Content-Type-Options |
| **Account enumeration** | ⚠️ Warning | "Invalid email or password" message is unified to prevent enumeration |

---

## F. Performance Review

| Issue | Type | Location | Impact | Fix |
|---|---|---|---|---|
| LIKE %search% without Full-Text Index | Query | `products.repository.ts:74-78` | Full Table Scan with large data | Add MySQL FULLTEXT index on name/description/sku |
| Missing index on `categoryId` in Product | Index | `product.entity.ts` | Category filtering slow | Add `@Index()` |
| Missing index on `productId` in SaleItem | Index | `sale-item.entity.ts` | Top-products and category-sales reports very slow | Add `@Index()` |
| Sale.findById loads all relations | N+1 | `sales.repository.ts:17-22` | Heavy with many sales | Use `query` instead of `find` with specific select |
| `findAllPaginated` loads inventory per product | Query | `products.repository.ts:70-71` | 2 queries (products + count) but inventory join adds overhead | Consider subquery |
| No Redis cache | Caching | — | Every request hits DB | Add Redis cache for categories and products list |
| `getSalesByDay` uses `SUM(sale.total)` on all sales | Query | `sales.repository.ts:91-106` | Heavy with millions of sales | Add materialized view or summary table |
| Frontend doesn't use explicit `trackBy` | Rendering | Products and POS | Angular must re-render all elements | @for in Angular 17+ uses automatic identity tracking |
| WebSocket broadcasts to every connected client | Scaling | `inventory.gateway.ts:68` | With 1000+ clients, broadcast becomes bottleneck | Use Redis adapter for horizontal scaling |

---

## G. Final Delivery Plan

### 1. Must Fix Before Submission (Priority 1)

```
□ F1: Fix WebSocket namespace — Remove namespace from InventoryGateway or add it to Frontend URL
   → inventory.gateway.ts:12 → namespace: '/' or remove the line

□ F2: Fix WebSocket event name — Choose one agreed-upon name
   → inventory.gateway.ts:68 → 'stockUpdated'
   → realtime.service.ts:46 → ['stockUpdated']

□ F3: Remove .env from git + rotate ALL secrets
   → git rm --cached backend/.env
   → Add to .gitignore
   → Change all secrets (JWT secrets, DB passwords)

□ F4: Add paymentMethod to Sale entity + CreateSaleDto
   → sale.entity.ts → Add column paymentMethod
   → create-sale.dto.ts → Add optional paymentMethod

□ F5: Validate categoryId existence before product create/update
   → products.service.ts → Inject CategoriesRepository → Check category exists
```

### 2. Should Fix If Time Allows (Priority 2)

```
□ F6: Restore inventory on refund
   → sales.service.ts: updateStatus → if REFUNDED, restore stock
□ F7: Set synchronize: false + run migrations properly
   → database.config.ts:20
□ F8: Allow EMPLOYEE to view sales list
   → sales.controller.ts:51
□ F9: Create seed migration/script
   → database/migrations/ + data-source.ts
□ F10: Add helmet for security headers
   → npm install helmet
□ F13: Standardize JWT expiry (15m access, 7d refresh)
   → backend/.env
```

### 3. Nice to Have (Priority 3)

```
□ F11: Add @Index on categoryId in Product entity
□ F12: Add @Index on productId in SaleItem entity
□ F14: Improve invoice number generation
□ F15: Fix discount — send as percentage from frontend
□ F16: Enable strictNullChecks in tsconfig
□ F17: Allow employees to connect to WebSocket
```

### 4. Final Test Checklist Before Submission

```
□  npm run test        (unit tests — no errors)
□  npm run test:e2e    (E2E tests — no errors)
□  npm run lint        (ESLint — no errors)
□  npm run build       (TypeScript build — no errors)
□  docker compose up   (Application runs without errors)
□  http://localhost:3000/api/docs (Swagger opens)
□  Login → Create product → Sell → Invoice
□  Verify WebSocket: Open DevTools → Network → WS
□  frontend: npm run build (production build)
□  Review .gitignore — no .env or secrets
□  frontend Playwright: npx playwright test
```

---

## Commands

```bash
# 1. Install
cd /home/baker/retail-backend
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 2. Docker (MySQL + Backend + Frontend)
docker compose up -d

# 3. Run Migrations
cd backend && npm run migration:run

# 4. Or local dev (MySQL only from Docker):
docker compose up db -d
cd backend && npm run start:dev
# Frontend terminal:
cd frontend && npm run dev

# 5. Tests
cd backend
npm test              # Unit tests
npm run test:e2e      # E2E tests
npm run test:all      # All tests
npm run lint          # Lint

# Frontend tests
cd frontend
npx playwright test   # E2E

# 6. Load tests (k6)
cd backend
k6 run load-tests/browse-and-buy.js
k6 run load-tests/heavy-load.js

# 7. Docker build only
docker compose build

# 8. Access
# Frontend: http://localhost:4200
# API:      http://localhost:3000/api/v1
# Swagger:  http://localhost:3000/api/docs
```

---

**Summary**: The project is excellent in architecture and engineering, but needs 3-4 days of work to fix critical issues (WebSocket, `.env`, paymentMethod, categoryId validation) before it's ready for submission as a Senior-Level Assessment. The critical issues center on a mismatch in event-driven design between Frontend and Backend, which completely disables the core real-time feature.
