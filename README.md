# Advanced Retail Inventory and Sales Management System

Full-stack retail management system built with **Angular 19**, **NestJS 10**, **TypeORM**, **MySQL 8**, and **Docker**.

## Overview

A production-ready POS and inventory system featuring real-time stock updates, role-based access control, and comprehensive reporting. The frontend is an Angular SPA served via Nginx, and the backend is a RESTful NestJS API with Socket.IO real-time capabilities.

## Architecture

```
┌──────────────┐      ┌──────────────┐      ┌──────────┐
│   Frontend   │ ──→  │   Backend    │ ──→  │  MySQL   │
│  Angular 19  │      │  NestJS 10   │      │    8     │
│   :4200      │      │   :3000      │      │  :3306   │
└──────────────┘      └──────┬───────┘      └──────────┘
                             │
                     ┌───────▼────────┐
                     │   Socket.IO    │
                     │  /inventory    │
                     └────────────────┘
```

- **Frontend** — Standalone Angular 19 with signals, Tailwind CSS, responsive design
- **Backend** — Modular NestJS with guards, interceptors, custom repositories, Swagger docs
- **Database** — MySQL 8 with TypeORM, migrations, pessimistic locking
- **Real-time** — Socket.IO namespace for live inventory updates
- **Container** — Docker Compose orchestrates all three services

## Quick Start

```bash
# Clone and enter
git clone <repo>
cd retail-backend

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your MySQL credentials

# Start everything
docker compose up -d

# Run migrations
docker compose exec backend npm run migration:run
```

| Service | URL | Credentials |
|---|---|---|
| Frontend | http://localhost:4200 | `admin@store.com` / `Admin@123` |
| Backend API | http://localhost:3000/api/v1 | — |
| Swagger Docs | http://localhost:3000/api/docs | — |
| MySQL | localhost:3306 | per `.env` |

## Project Structure

```
retail-backend/
├── backend/               # NestJS API
│   ├── src/
│   │   ├── auth/          # JWT auth (login, refresh, logout)
│   │   ├── categories/    # Product categories
│   │   ├── common/        # Guards, interceptors, filters
│   │   ├── config/        # Environment validation
│   │   ├── database/      # TypeORM data-source, migrations
│   │   ├── inventory/     # Stock management + WebSocket gateway
│   │   ├── products/      # Product CRUD, search, low-stock
│   │   ├── reports/       # Sales/stock reports
│   │   ├── sales/         # Sales transactions, invoices
│   │   └── users/         # User management
│   ├── Dockerfile
│   └── package.json
├── frontend/              # Angular 19 SPA
│   ├── src/app/
│   │   ├── core/          # Guards, interceptors, services
│   │   ├── features/      # Pages (auth, dashboard, products, etc.)
│   │   ├── layout/        # Responsive shell
│   │   └── shared/        # Icons, modals, toast, chart
│   ├── e2e/               # Playwright tests
│   ├── Dockerfile
│   ├── nginx.conf         # SPA fallback config
│   └── package.json
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## Features

### Frontend
- **Dashboard** — Revenue, transaction, and low-stock KPIs with sales trend chart
- **Products** — Full CRUD with search, category/price filters, sortable table, real-time stock updates
- **Categories** — CRUD with active/inactive toggle
- **POS** — Product catalog with cart, quantity controls, checkout, invoice
- **Sales** — Transaction history with status badges and invoice viewer
- **Reports** — Summary KPIs, top products, sales by day, stock report with CSV export
- **Users** — Admin-only user management with role assignment and toggle active
- **Real-time** — Live stock sync indicator via Socket.IO
- **Responsive** — Mobile sidebar, adaptive grids, print-friendly invoices

### Backend
- **JWT auth** — Access/refresh token rotation, account lockout after 5 failed attempts
- **Role-based access** — Admin, manager, employee roles with route guards
- **Search & filters** — Full-text search, category/price/stock filters, paginated + sortable
- **Sales processing** — Transactional with pessimistic stock locking, duplicate aggregation
- **Inventory** — Low-stock detection, per-product min stock thresholds
- **Reports** — Aggregation queries (SUM, COUNT, AVG, GROUP BY) with date ranges
- **Real-time** — Socket.IO gateway emitting stock updates on each sale
- **Audit logging** — Auth events and CRUD operations logged
- **Rate limiting** — Auth endpoints throttled

## Testing

49 Playwright e2e tests cover the full stack:

```bash
# From the frontend directory
cd frontend

# Run all tests (14 UI + 35 API)
npx playwright test
```

| Suite | Tests | Description |
|---|---|---|
| `app.spec.ts` | 14 | Login, dashboard, products CRUD + search, categories CRUD, POS, sales, reports, users, real-time, logout |
| `backend-api.spec.ts` | 35 | All backend endpoints: auth, categories, products, inventory, sales, reports, users, auth guards, cleanup |

## API Overview

All endpoints are prefixed with `/api/v1` and responses are wrapped in `{ success, data, message }`.

| Module | Key Endpoints |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/profile` |
| Categories | CRUD: `POST/GET /categories`, `GET/PATCH/DELETE /categories/:id` |
| Products | CRUD: `POST/GET /products`, `GET/PATCH/DELETE /products/:id`, `GET /products/low-stock` |
| Inventory | `GET /inventory/low-stock`, `GET /inventory/stats`, `PATCH /inventory/:productId/minimum-stock` |
| Sales | `POST/GET /sales`, `GET /sales/:id`, `GET /sales/:id/invoice`, `PATCH /sales/:id/status` |
| Reports | `GET /reports/summary`, `GET /reports/top-products`, `GET /reports/sales-by-day`, `GET /reports/sales-by-category`, `GET /reports/stock` |
| Users | `POST/GET /users`, `GET/PATCH /users/:id`, `PATCH /users/:id/toggle-active` |

Full Swagger documentation at `/api/docs`.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 19, TypeScript 5, Tailwind CSS 3, Socket.IO Client |
| Backend | NestJS 10, TypeScript 5, TypeORM 0.3, Passport JWT, Socket.IO |
| Database | MySQL 8 |
| Container | Docker, Docker Compose |
| Testing | Playwright 1.61 |
| CI | GitHub Actions |

## Docker

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down

# Rebuild after changes
docker compose up -d --build
```
