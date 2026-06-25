import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, map } from "rxjs";
import { environment } from "../../../environments/environment";
import {
  CategorySales,
  DailySales,
  DashboardStats,
  SalesReportPoint,
  SalesSummary,
  StockReportItem,
  TopProduct,
} from "../models";
import { toParams, unwrap } from "./api.util";

interface DateRange {
  startDate?: string;
  endDate?: string;
}

@Injectable({ providedIn: "root" })
export class ReportService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/reports`;

  summary(range: DateRange = {}): Observable<SalesSummary> {
    return this.http
      .get(`${this.base}/summary`, { params: toParams(range as Record<string, unknown>) })
      .pipe(map((r) => unwrap<SalesSummary>(r as never)));
  }

  dashboard(): Observable<DashboardStats> {
    return this.http
      .get(`${this.base}/summary`)
      .pipe(
        map((r) => {
          const s = unwrap<SalesSummary>(r as never);
          return {
            todayRevenue: s.totalRevenue,
            todaySalesCount: s.totalTransactions,
            totalProducts: 0,
            lowStockCount: 0,
          } as DashboardStats;
        }),
      );
  }

  salesTrend(days: number): Observable<SalesReportPoint[]> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    return this.http
      .get(`${this.base}/sales-by-day`, {
        params: toParams({
          startDate: start.toISOString().slice(0, 10),
          endDate: end.toISOString().slice(0, 10),
        } as Record<string, unknown>),
      })
      .pipe(
        map((r) => {
          const items = this.arr<DailySales>(r);
          return items.map((d) => ({ date: d.date, total: d.revenue, count: d.transactions }));
        }),
      );
  }

  topProducts(startDate?: string, endDate?: string, limit = 10): Observable<TopProduct[]> {
    return this.http
      .get(`${this.base}/top-products`, {
        params: toParams({ startDate, endDate, limit } as Record<string, unknown>),
      })
      .pipe(map((r) => this.arr<TopProduct>(r)));
  }

  salesByDay(range: DateRange = {}): Observable<DailySales[]> {
    return this.http
      .get(`${this.base}/sales-by-day`, { params: toParams(range as Record<string, unknown>) })
      .pipe(map((r) => this.arr<DailySales>(r)));
  }

  salesByCategory(range: DateRange = {}): Observable<CategorySales[]> {
    return this.http
      .get(`${this.base}/sales-by-category`, { params: toParams(range as Record<string, unknown>) })
      .pipe(map((r) => this.arr<CategorySales>(r)));
  }

  stock(): Observable<StockReportItem[]> {
    return this.http.get(`${this.base}/stock`).pipe(
      map((r) => {
        const data = unwrap<unknown>(r as never);
        if (Array.isArray(data)) return data as StockReportItem[];
        const obj = (data ?? {}) as Record<string, unknown>;
        return (obj["items"] ?? obj["products"] ?? []) as StockReportItem[];
      }),
    );
  }

  /** For backwards compat with reports component */
  salesByRange(startDate: string, endDate: string): Observable<SalesReportPoint[]> {
    return this.http
      .get(`${this.base}/sales-by-day`, {
        params: toParams({ startDate, endDate } as Record<string, unknown>),
      })
      .pipe(
        map((r) => {
          const items = this.arr<DailySales>(r);
          return items.map((d) => ({ date: d.date, total: d.revenue, count: d.transactions }));
        }),
      );
  }

  private arr<T>(r: unknown): T[] {
    const data = unwrap<unknown>(r as never);
    if (Array.isArray(data)) return data as T[];
    const obj = (data ?? {}) as Record<string, unknown>;
    return (obj["items"] ?? obj["data"] ?? []) as T[];
  }
}
