# Retail Frontend

Angular 19 SPA for the Advanced Retail Inventory and Sales Management System.

## Tech Stack

- **Framework** — Angular 19 (standalone components, signals)
- **Styling** — Tailwind CSS 3
- **State** — Angular signals (`signal()`, `computed()`)
- **Real-time** — Socket.IO Client
- **HTTP** — Angular `HttpClient` with token refresh interceptor
- **Testing** — Playwright (e2e)
- **Container** — Docker (Nginx)

## Pages & Routes

| Path | Page | Description |
|---|---|---|
| `/login` | Login | Email/password auth with validation |
| `/dashboard` | Dashboard | KPI cards, sales trend chart, low-stock alerts |
| `/products` | Products | CRUD, search, filter by category/price, sort |
| `/categories` | Categories | CRUD with active/inactive status |
| `/pos` | POS | Product catalog with cart, checkout |
| `/sales` | Sales | Transaction history, invoice viewer |
| `/reports` | Reports | Summary KPIs, top products, sales by day, stock |
| `/users` | Users | Admin-only user management |

## Prerequisites

- Node.js 20+
- Angular CLI 19 (`npm install -g @angular/cli`)
- Backend API running on `http://localhost:3000` (or configured proxy)

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

The app runs at `http://localhost:4200` and proxies API requests to `http://localhost:3000`.

**Default credentials:** `admin@store.com` / `Admin@123`

## E2E Tests

Playwright tests cover both frontend UI flows and backend API endpoints:

```bash
# Run all tests
npx playwright test

# Frontend UI tests only
npx playwright test app.spec.ts

# Backend API tests only
npx playwright test backend-api.spec.ts

# View HTML report
npx playwright show-report
```

### Test Coverage

**Frontend (14 tests):** Login, dashboard KPIs, real-time indicator, products CRUD + search, categories CRUD, POS page, sales page, reports page, users page, logout.

**Backend API (35 tests):** Auth (login, wrong password, profile, refresh, logout), categories CRUD, products CRUD + search + low-stock, inventory (low-stock, stats, min stock), sales (create, list, invoice), reports (summary, top-products, sales-by-day, stock), users CRUD + toggle-active, auth guards, cleanup.

## Docker

```bash
# Build image
docker build -t retail-frontend .

# Run with compose (from project root)
docker compose up -d frontend
```

The production build serves the app via Nginx on port 80 (mapped to host port 4200).

## Project Structure

```
src/app/
├── core/
│   ├── guards/            # Auth + guest guards
│   ├── interceptors/      # Token refresh HTTP interceptor
│   ├── services/          # Realtime (Socket.IO), Auth, API services
│   └── models/            # TypeScript interfaces
├── features/
│   ├── auth/              # Login page
│   ├── categories/        # Category management
│   ├── dashboard/         # KPI dashboard
│   ├── pos/               # Point of sale
│   ├── products/          # Product management
│   ├── reports/           # Sales/stock reports
│   ├── sales/             # Sales history & invoices
│   └── users/             # User management
├── layout/
│   └── shell/             # Responsive sidebar + topbar
└── shared/
    ├── icon/              # SVG icon system (30+ icons)
    ├── modal/             # Reusable modal
    ├── confirm-dialog/    # Confirmation dialog
    ├── toast-container/   # Toast notifications
    └── bar-chart/         # Simple bar chart component
```

## Features

- **Responsive design** — mobile sidebar with overlay, adaptive grid layouts
- **Real-time stock updates** — Socket.IO integration for live inventory changes
- **Signal-based state** — efficient change detection with Angular signals
- **Debounced search** — 350ms debounce on product search
- **Skeleton loaders** — loading states across all pages
- **Error handling** — toast notifications, inline validation, error pages
- **Role-based UI** — menu items and actions gated by user role
- **Cart system** — POS with quantity controls, subtotal, tax, total
- **Invoice printing** — print-friendly CSS for sales invoices
- **CSV export** — report data export
- **Token refresh** — automatic silent refresh with request queuing
