import { Routes } from "@angular/router";
import { authGuard, guestGuard } from "./core/guards/auth.guard";

export const routes: Routes = [
  {
    path: "login",
    canActivate: [guestGuard],
    loadComponent: () =>
      import("./features/auth/login.component").then((m) => m.LoginComponent),
  },
  {
    path: "",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./layout/shell.component").then((m) => m.ShellComponent),
    children: [
      { path: "", pathMatch: "full", redirectTo: "dashboard" },
      {
        path: "dashboard",
        loadComponent: () =>
          import("./features/dashboard/dashboard.component").then((m) => m.DashboardComponent),
      },
      {
        path: "products",
        loadComponent: () =>
          import("./features/products/products.component").then((m) => m.ProductsComponent),
      },
      {
        path: "pos",
        loadComponent: () =>
          import("./features/pos/pos.component").then((m) => m.PosComponent),
      },
      {
        path: "sales",
        loadComponent: () =>
          import("./features/sales/sales.component").then((m) => m.SalesComponent),
      },
      {
        path: "reports",
        loadComponent: () =>
          import("./features/reports/reports.component").then((m) => m.ReportsComponent),
      },
      {
        path: "categories",
        loadComponent: () =>
          import("./features/categories/categories.component").then((m) => m.CategoriesComponent),
      },
      {
        path: "users",
        loadComponent: () =>
          import("./features/users/users.component").then((m) => m.UsersComponent),
      },
    ],
  },
  { path: "**", redirectTo: "" },
];
