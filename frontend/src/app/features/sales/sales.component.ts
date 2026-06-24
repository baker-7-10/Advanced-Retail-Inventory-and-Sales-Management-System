import { CurrencyPipe, DatePipe } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { Sale } from "../../core/models";
import { SaleService } from "../../core/services/sale.service";
import { ToastService } from "../../core/services/toast.service";
import { IconComponent } from "../../shared/ui/icon.component";
import { ModalComponent } from "../../shared/ui/modal.component";

@Component({
  selector: "app-sales",
  standalone: true,
  imports: [CurrencyPipe, DatePipe, IconComponent, ModalComponent],
  template: `
    <div class="space-y-5">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">Sales History</h2>
        <p class="text-sm text-muted-foreground">View and manage all completed transactions.</p>
      </div>

      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th class="px-4 py-3 font-semibold">#</th>
                <th class="px-4 py-3 font-semibold">Date</th>
                <th class="px-4 py-3 font-semibold">Items</th>
                <th class="px-4 py-3 font-semibold">Payment</th>
                <th class="px-4 py-3 font-semibold">Status</th>
                <th class="px-4 py-3 text-right font-semibold">Total</th>
                <th class="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                @for (i of [1,2,3,4,5]; track i) {
                  <tr class="border-b border-border">
                    <td class="px-4 py-4" colspan="7">
                      <div class="h-5 w-full animate-pulse rounded bg-muted"></div>
                    </td>
                  </tr>
                }
              } @else if (sales().length === 0) {
                <tr>
                  <td colspan="7" class="px-4 py-16 text-center text-muted-foreground">
                    <p class="font-medium">No sales yet</p>
                    <p class="text-sm">Complete a sale from the POS to see it here.</p>
                  </td>
                </tr>
              } @else {
                @for (s of sales(); track s.id) {
                  <tr class="border-b border-border transition-colors hover:bg-muted/40">
                    <td class="px-4 py-3 font-mono text-xs text-muted-foreground">#{{ s.id }}</td>
                    <td class="px-4 py-3 text-muted-foreground">{{ s.createdAt | date: 'MMM d, h:mm a' }}</td>
                    <td class="px-4 py-3">{{ s.items.length }}</td>
                    <td class="px-4 py-3 capitalize">{{ s.paymentMethod || '—' }}</td>
                    <td class="px-4 py-3">
                      <span class="badge" [style.background]="statusBg(s.status)" [style.color]="statusColor(s.status)">
                        {{ s.status }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-right font-semibold">{{ s.total | currency }}</td>
                    <td class="px-4 py-3 text-right">
                      <button class="btn-ghost px-2 py-1.5" (click)="viewInvoice(s)" title="View invoice">
                        <app-icon name="receipt" [size]="17" />
                      </button>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        @if (meta(); as m) {
          <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
            <p class="text-muted-foreground">Page {{ m.page }} of {{ m.totalPages }} ({{ m.total }} total)</p>
            <div class="flex items-center gap-2">
              <button class="btn-outline px-3 py-1.5" [disabled]="m.page <= 1" (click)="goToPage(m.page - 1)">Prev</button>
              <button class="btn-outline px-3 py-1.5" [disabled]="m.page >= (m.totalPages || 1)" (click)="goToPage(m.page + 1)">Next</button>
            </div>
          </div>
        }
      </div>
    </div>

    @if (selectedSale(); as s) {
      <app-modal title="Invoice #{{ s.id }}" (close)="selectedSale.set(null)" widthClass="max-w-md">
        <div class="space-y-3 text-sm">
          <div class="flex justify-between text-muted-foreground">
            <span>Date</span>
            <span>{{ s.createdAt | date: 'medium' }}</span>
          </div>
          <div class="flex justify-between text-muted-foreground">
            <span>Payment</span>
            <span class="capitalize">{{ s.paymentMethod || '—' }}</span>
          </div>
          <div class="flex justify-between text-muted-foreground">
            <span>Status</span>
            <span>{{ s.status }}</span>
          </div>

          <div class="border-t border-border pt-3">
            <table class="w-full">
              <tbody>
                @for (item of s.items; track item.productId) {
                  <tr>
                    <td class="py-1">
                      <span class="font-medium">{{ item.productName }}</span>
                      <span class="block text-xs text-muted-foreground">{{ item.quantity }} × {{ item.unitPrice | currency }}</span>
                    </td>
                    <td class="py-1 text-right font-medium">{{ (item.quantity * item.unitPrice) | currency }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="border-t border-border pt-3 space-y-1">
            <div class="flex justify-between text-muted-foreground">
              <span>Subtotal</span><span>{{ s.subtotal | currency }}</span>
            </div>
            @if (s.discount) {
              <div class="flex justify-between text-muted-foreground">
                <span>Discount</span><span>-{{ s.discount | currency }}</span>
              </div>
            }
            <div class="flex justify-between font-bold text-base">
              <span>Total</span><span>{{ s.total | currency }}</span>
            </div>
          </div>
        </div>
      </app-modal>
    }
  `,
})
export class SalesComponent implements OnInit {
  private saleSvc = inject(SaleService);
  private toast = inject(ToastService);

  sales = signal<Sale[]>([]);
  meta = signal<{ page: number; totalPages: number; total: number } | null>(null);
  loading = signal(true);
  selectedSale = signal<Sale | null>(null);

  private page = signal(1);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.saleSvc.list({ page: this.page(), limit: 15 }).subscribe({
      next: (res) => {
        this.sales.set(res.items);
        this.meta.set(res.meta);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error("Failed to load sales.");
      },
    });
  }

  goToPage(p: number): void {
    this.page.set(p);
    this.load();
  }

  viewInvoice(s: Sale): void {
    this.selectedSale.set(s);
  }

  statusColor(status: string): string {
    switch (status) {
      case "completed": return "var(--success)";
      case "pending": return "var(--warning)";
      case "cancelled": return "var(--danger)";
      case "refunded": return "var(--muted-foreground)";
      default: return "var(--muted-foreground)";
    }
  }

  statusBg(status: string): string {
    switch (status) {
      case "completed": return "rgba(5,150,105,0.1)";
      case "pending": return "rgba(217,119,6,0.12)";
      case "cancelled": return "rgba(220,38,38,0.1)";
      case "refunded": return "rgba(100,116,139,0.1)";
      default: return "rgba(100,116,139,0.1)";
    }
  }
}
