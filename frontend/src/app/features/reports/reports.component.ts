import { CurrencyPipe, DecimalPipe } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { forkJoin } from "rxjs";
import { SalesReportPoint, TopProduct } from "../../core/models";
import { ReportService } from "../../core/services/report.service";
import { ToastService } from "../../core/services/toast.service";
import { IconComponent } from "../../shared/icon.component";
import { BarChartComponent, ChartPoint } from "../../shared/bar-chart.component";

@Component({
  selector: "app-reports",
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, ReactiveFormsModule, IconComponent, BarChartComponent],
  template: `
    <div class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold tracking-tight">Reports & Analytics</h2>
          <p class="text-sm text-muted-foreground">Analyze sales performance, revenue, and stock health.</p>
        </div>
        <button class="btn-outline" (click)="exportCsv()" [disabled]="trend().length === 0">
          <app-icon name="download" [size]="16" /> Export CSV
        </button>
      </div>

      <div class="card p-4">
        <form [formGroup]="range" class="flex flex-wrap items-end gap-3">
          <div>
            <label class="label" for="from">From</label>
            <input id="from" type="date" class="input" formControlName="from" />
          </div>
          <div>
            <label class="label" for="to">To</label>
            <input id="to" type="date" class="input" formControlName="to" />
          </div>
          <button class="btn-primary" (click)="load()">Apply</button>
          <div class="ml-auto flex gap-1">
            @for (p of presets; track p.days) {
              <button type="button" class="badge border border-border px-3 py-1.5 hover:bg-muted" (click)="applyPreset(p.days)">{{ p.label }}</button>
            }
          </div>
        </form>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <div class="card p-5">
          <p class="text-sm text-muted-foreground">Total revenue</p>
          <p class="mt-1 text-2xl font-bold">{{ totalRevenue() | currency }}</p>
        </div>
        <div class="card p-5">
          <p class="text-sm text-muted-foreground">Total transactions</p>
          <p class="mt-1 text-2xl font-bold">{{ totalOrders() | number }}</p>
        </div>
        <div class="card p-5">
          <p class="text-sm text-muted-foreground">Avg. order value</p>
          <p class="mt-1 text-2xl font-bold">{{ avgOrder() | currency }}</p>
        </div>
      </div>

      <div class="grid gap-5 lg:grid-cols-3">
        <div class="card p-5 lg:col-span-2">
          <h3 class="mb-4 font-semibold">Revenue trend</h3>
          <div class="h-64">
            @if (loading()) {
              <div class="h-full w-full animate-pulse rounded-lg bg-muted"></div>
            } @else if (trend().length === 0) {
              <div class="flex h-full items-center justify-center text-sm text-muted-foreground">No data for this range</div>
            } @else {
              <app-bar-chart [data]="chartData()" />
            }
          </div>
        </div>

        <div class="card p-5">
          <h3 class="mb-4 font-semibold">Top products</h3>
          @if (loading()) {
            <div class="space-y-3">@for (i of [1,2,3,4,5]; track i) { <div class="h-9 animate-pulse rounded bg-muted"></div> }</div>
          } @else if (topProducts().length === 0) {
            <p class="py-8 text-center text-sm text-muted-foreground">No sales recorded</p>
          } @else {
            <ol class="space-y-2">
              @for (t of topProducts(); track t.productId; let i = $index) {
                <li class="flex items-center gap-3">
                  <span class="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{{ i + 1 }}</span>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium">{{ t.productName }}</p>
                    <p class="text-xs text-muted-foreground">{{ t.quantitySold }} sold</p>
                  </div>
                  <span class="text-sm font-semibold">{{ t.revenue | currency }}</span>
                </li>
              }
            </ol>
          }
        </div>
      </div>
    </div>
  `,
})
export class ReportsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private reportSvc = inject(ReportService);
  private toast = inject(ToastService);

  loading = signal(true);
  trend = signal<SalesReportPoint[]>([]);
  topProducts = signal<TopProduct[]>([]);
  chartData = signal<ChartPoint[]>([]);
  totalRevenue = signal(0);
  totalOrders = signal(0);
  avgOrder = signal(0);

  presets = [
    { label: "7D", days: 7 },
    { label: "30D", days: 30 },
    { label: "90D", days: 90 },
  ];

  range = this.fb.group({
    from: [this.daysAgo(30)],
    to: [this.today()],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const { from, to } = this.range.getRawValue();
    forkJoin({
      sales: this.reportSvc.salesByRange(from!, to!),
      top: this.reportSvc.topProducts(from!, to!, 5),
    }).subscribe({
      next: ({ sales, top }) => {
        this.trend.set(sales);
        this.topProducts.set(top);
        this.chartData.set(sales.map((s) => ({ label: this.shortDate(s.date), value: s.total })));
        const rev = sales.reduce((sum, s) => sum + s.total, 0);
        const orders = sales.reduce((sum, s) => sum + (s.count ?? 0), 0);
        this.totalRevenue.set(rev);
        this.totalOrders.set(orders);
        this.avgOrder.set(orders > 0 ? rev / orders : 0);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error("Failed to load report data.");
      },
    });
  }

  applyPreset(days: number): void {
    this.range.patchValue({ from: this.daysAgo(days), to: this.today() });
    this.load();
  }

  exportCsv(): void {
    const rows = [["Date", "Revenue", "Orders"], ...this.trend().map((s) => [s.date, String(s.total), String(s.count ?? 0)])];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${this.range.value.from}-to-${this.range.value.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toast.success("Report exported.");
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
  private daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }
  private shortDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
}
