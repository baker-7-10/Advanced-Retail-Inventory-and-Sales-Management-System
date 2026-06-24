import { CurrencyPipe, DecimalPipe } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { forkJoin } from "rxjs";
import { Product, SalesReportPoint } from "../../core/models";
import { ReportService } from "../../core/services/report.service";
import { InventoryService } from "../../core/services/inventory.service";
import { IconComponent, IconName } from "../../shared/icon.component";
import { BarChartComponent, ChartPoint } from "../../shared/bar-chart.component";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, RouterLink, IconComponent, BarChartComponent],
  template: `
    <div class="space-y-5">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p class="text-sm text-muted-foreground">A snapshot of store performance.</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        @for (kpi of kpis(); track kpi.label) {
          <div class="card p-5">
            <div class="flex items-center justify-between">
              <span class="flex h-10 w-10 items-center justify-center rounded-lg" [style.background]="kpi.bg" [style.color]="kpi.color">
                <app-icon [name]="kpi.icon" [size]="20" />
              </span>
            </div>
            <p class="mt-4 text-2xl font-bold">
              @if (loading()) { <span class="inline-block h-7 w-24 animate-pulse rounded bg-muted"></span> }
              @else { {{ kpi.isCurrency ? (kpi.value | currency) : (kpi.value | number) }} }
            </p>
            <p class="text-sm text-muted-foreground">{{ kpi.label }}</p>
          </div>
        }
      </div>

      <div class="grid gap-5 lg:grid-cols-3">
        <div class="card p-5 lg:col-span-2">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="font-semibold">Sales trend (last 7 days)</h3>
            <a routerLink="/reports" class="text-sm font-medium text-primary hover:underline">View reports</a>
          </div>
          <div class="h-56">
            @if (!loading()) {
              <app-bar-chart [data]="chartData()" />
            } @else {
              <div class="h-full w-full animate-pulse rounded-lg bg-muted"></div>
            }
          </div>
        </div>

        <div class="card p-5">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="font-semibold">Low stock alerts</h3>
            <a routerLink="/products" class="text-sm font-medium text-primary hover:underline">Manage</a>
          </div>
          @if (loading()) {
            <div class="space-y-3">
              @for (i of [1,2,3,4]; track i) { <div class="h-10 animate-pulse rounded bg-muted"></div> }
            </div>
          } @else if (lowStock().length === 0) {
            <div class="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              <app-icon name="check" [size]="28" />
              <p class="mt-2 text-sm">All products well stocked</p>
            </div>
          } @else {
            <ul class="space-y-2">
              @for (p of lowStock(); track p.id) {
                <li class="flex items-center justify-between rounded-lg border border-border p-2.5">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium">{{ p.name }}</p>
                    <p class="text-xs text-muted-foreground">{{ p.sku }}</p>
                  </div>
                  <span class="badge" style="background: rgba(217,119,6,0.12); color: var(--warning)">{{ p.stock }} left</span>
                </li>
              }
            </ul>
          }
        </div>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private reportSvc = inject(ReportService);
  private inventorySvc = inject(InventoryService);

  loading = signal(true);
  lowStock = signal<Product[]>([]);
  chartData = signal<ChartPoint[]>([]);

  kpis = signal<
    { label: string; value: number; icon: IconName; color: string; bg: string; isCurrency: boolean }[]
  >([]);

  ngOnInit(): void {
    forkJoin({
      summary: this.reportSvc.summary(),
      low: this.inventorySvc.lowStock(),
      sales: this.reportSvc.salesTrend(7),
    }).subscribe({
      next: ({ summary, low, sales }) => {
        this.lowStock.set(low.slice(0, 5));
        this.chartData.set(
          sales.map((s: SalesReportPoint) => ({ label: this.shortDate(s.date), value: s.total })),
        );
        this.kpis.set([
          { label: "Total revenue", value: summary.totalRevenue, icon: "cash", color: "var(--success)", bg: "rgba(5,150,105,0.1)", isCurrency: true },
          { label: "Transactions", value: summary.totalTransactions, icon: "receipt", color: "var(--primary)", bg: "rgba(29,78,216,0.1)", isCurrency: false },
          { label: "Avg sale value", value: summary.averageSale, icon: "trend", color: "#7c3aed", bg: "rgba(124,58,237,0.1)", isCurrency: true },
          { label: "Low stock items", value: low.length, icon: "alert", color: "var(--warning)", bg: "rgba(217,119,6,0.12)", isCurrency: false },
        ]);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.kpis.set([
          { label: "Total revenue", value: 0, icon: "cash", color: "var(--success)", bg: "rgba(5,150,105,0.1)", isCurrency: true },
          { label: "Transactions", value: 0, icon: "receipt", color: "var(--primary)", bg: "rgba(29,78,216,0.1)", isCurrency: false },
          { label: "Avg sale value", value: 0, icon: "trend", color: "#7c3aed", bg: "rgba(124,58,237,0.1)", isCurrency: true },
          { label: "Low stock items", value: 0, icon: "alert", color: "var(--warning)", bg: "rgba(217,119,6,0.12)", isCurrency: false },
        ]);
      },
    });
  }

  private shortDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { weekday: "short" });
  }
}
