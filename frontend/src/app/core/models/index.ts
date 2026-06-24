// ----- Shared API envelope -----
export interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  data: T;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

// ----- Auth / Users -----
export type UserRole = "admin" | "manager" | "employee";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthPayload {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export type UpdateUserDto = Partial<Omit<CreateUserDto, "password">> & {
  password?: string;
};

// ----- Categories -----
export interface Category {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryDto {
  name: string;
  description?: string;
}

export type UpdateCategoryDto = Partial<CreateCategoryDto>;

// ----- Products -----
export interface Product {
  id: number;
  name: string;
  sku: string;
  description?: string;
  price: number;
  stock: number;
  minimumStock?: number;
  isActive: boolean;
  categoryId: number;
  category?: Category;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDto {
  name: string;
  description?: string;
  price: number;
  stock: number;
  categoryId: number;
  sku: string;
}

export type UpdateProductDto = Partial<CreateProductDto>;

export interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  order?: "ASC" | "DESC";
}

// ----- Sales -----
export type SaleStatus = "completed" | "pending" | "cancelled" | "refunded";
export type PaymentMethod = "cash" | "card" | "transfer";

export interface SaleItem {
  id?: number;
  productId: number;
  productName?: string;
  quantity: number;
  unitPrice: number;
  subtotal?: number;
}

export interface Sale {
  id: number;
  subtotal: number;
  total: number;
  discount?: number;
  tax?: number;
  amountPaid?: number;
  change?: number;
  status: SaleStatus;
  paymentMethod?: PaymentMethod;
  cashierName?: string;
  invoiceNumber?: string;
  items: SaleItem[];
  user?: Pick<User, "id" | "name" | "email">;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSaleDto {
  items: { productId: number; quantity: number; unitPrice: number }[];
  paymentMethod?: PaymentMethod;
  discount?: number;
  amountPaid?: number;
}

export interface Invoice {
  saleId: number;
  date: string;
  cashier: { id: number; name: string };
  items: {
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  subtotal: number;
  tax?: number;
  total: number;
  paymentMethod?: string;
}

// ----- Inventory -----
export interface InventoryStats {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

// ----- Reports -----
export interface SalesSummary {
  totalRevenue: number;
  totalTransactions: number;
  averageSale: number;
  totalItemsSold?: number;
}

export interface DailySales {
  date: string;
  revenue: number;
  transactions: number;
}

export interface TopProduct {
  productId: number;
  productName: string;
  quantitySold: number;
  revenue: number;
}

export interface CategorySales {
  categoryId: number;
  categoryName: string;
  revenue: number;
  quantity?: number;
}

export interface StockReportItem {
  productId: number;
  productName: string;
  sku: string;
  stock: number;
  minimumStock: number;
  isLow: boolean;
}

// ----- Dashboard -----
export interface DashboardStats {
  todayRevenue: number;
  todaySalesCount: number;
  totalProducts: number;
  lowStockCount: number;
}

export interface SalesReportPoint {
  date: string;
  total: number;
  count?: number;
}
