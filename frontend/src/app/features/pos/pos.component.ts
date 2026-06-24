import { CurrencyPipe } from "@angular/common";
import { Component, OnDestroy, OnInit, inject, signal } from "@angular/core";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from "rxjs";
import { Category, Product, Sale } from "../../core/models";
import { CategoryService } from "../../core/services/category.service";
import { ProductService } from "../../core/services/product.service";
import { CartService } from "../../core/services/cart.service";
import { RealtimeService } from "../../core/services/realtime.service";
import { ToastService } from "../../core/services/toast.service";
import { IconComponent } from "../../shared/icon.component";
import { CheckoutComponent } from "./checkout.component";
import { InvoiceComponent } from "./invoice.component";

@Component({
  selector: "app-pos",
  standalone: true,
  imports: [CurrencyPipe, ReactiveFormsModule, IconComponent, CheckoutComponent, InvoiceComponent],
  template: `
    <div class="grid h-[calc(100vh-9rem)] gap-5 lg:grid-cols-[1fr_24rem]">
      <!-- Product catalog -->
      <div class="flex min-h-0 flex-col">
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <div class="relative flex-1 min-w-48">
            <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <app-icon name="search" [size]="18" />
            </span>
            <input class="input pl-10" [formControl]="search" placeholder="Search products or scan SKU…" />
          </div>
          <div class="flex gap-1 overflow-x-auto">
            <button class="badge whitespace-nowrap border px-3 py-1.5"
              [class.bg-primary]="activeCategory() === null" [class.text-primary-foreground]="activeCategory() === null"
              [class.border-border]="activeCategory() !== null"
              (click)="filterCategory(null)">All</button>
            @for (c of categories(); track c.id) {
              <button class="badge whitespace-nowrap border px-3 py-1.5"
                [class.bg-primary]="activeCategory() === c.id" [class.text-primary-foreground]="activeCategory() === c.id"
                [class.border-border]="activeCategory() !== c.id"
                (click)="filterCategory(c.id)">{{ c.name }}</button>
            }
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto pr-1">
          @if (loading()) {
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              @for (i of skeletons; track i) {
                <div class="h-28 animate-pulse rounded-xl bg-muted"></div>
              }
            </div>
          } @else if (products().length === 0) {
            <div class="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <app-icon name="box" [size]="32" />
              <p class="mt-2">No products available</p>
            </div>
          } @else {
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              @for (p of products(); track p.id) {
                <button
                  class="card flex flex-col items-start gap-1 p-3 text-left transition-all hover:border-primary hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                  [disabled]="p.stock <= 0"
                  (click)="add(p)">
                  <div class="flex w-full items-start justify-between">
                    <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <app-icon name="package" [size]="18" />
                    </div>
                    <span class="badge text-xs" [style.background]="p.stock <= 0 ? 'rgba(220,38,38,0.1)' : 'var(--muted)'"
                      [style.color]="p.stock <= 0 ? 'var(--danger)' : 'var(--muted-foreground)'">
                      {{ p.stock <= 0 ? 'Out' : p.stock }}
                    </span>
                  </div>
                  <p class="mt-1 line-clamp-2 text-sm font-medium leading-tight">{{ p.name }}</p>
                  <p class="text-sm font-bold text-primary">{{ p.price | currency }}</p>
                </button>
              }
            </div>
          }
        </div>
      </div>

      <!-- Cart -->
      <div class="card flex min-h-0 flex-col">
        <div class="flex items-center justify-between border-b border-border p-4">
          <h3 class="flex items-center gap-2 font-semibold">
            <app-icon name="cart" [size]="18" /> Current sale
          </h3>
          @if (cart.items().length > 0) {
            <button class="btn-ghost px-2 py-1 text-xs" style="color: var(--danger)" (click)="cart.clear()">Clear</button>
          }
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto p-3">
          @if (cart.items().length === 0) {
            <div class="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <app-icon name="cart" [size]="32" />
              <p class="mt-2 text-sm">Cart is empty</p>
              <p class="text-xs">Tap a product to add it</p>
            </div>
          } @else {
            <div class="space-y-2">
              @for (item of cart.items(); track item.product.id) {
                <div class="flex items-center gap-2 rounded-lg border border-border p-2">
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium">{{ item.product.name }}</p>
                    <p class="text-xs text-muted-foreground">{{ item.product.price | currency }} each</p>
                  </div>
                  <div class="flex items-center gap-1">
                    <button class="btn-outline h-7 w-7 p-0" (click)="cart.decrement(item.product.id)" aria-label="Decrease">
                      <app-icon name="minus" [size]="14" />
                    </button>
                    <span class="w-7 text-center text-sm font-medium">{{ item.quantity }}</span>
                    <button class="btn-outline h-7 w-7 p-0" [disabled]="item.quantity >= item.product.stock" (click)="cart.increment(item.product.id)" aria-label="Increase">
                      <app-icon name="plus" [size]="14" />
                    </button>
                  </div>
                  <span class="w-16 text-right text-sm font-semibold">{{ item.product.price * item.quantity | currency }}</span>
                </div>
              }
            </div>
          }
        </div>

        <div class="border-t border-border p-4">
          <div class="mb-3 space-y-1 text-sm">
            <div class="flex justify-between text-muted-foreground">
              <span>Subtotal</span><span>{{ cart.subtotal() | currency }}</span>
            </div>
            <div class="flex justify-between text-muted-foreground">
              <span>Tax</span><span>{{ cart.tax() | currency }}</span>
            </div>
            <div class="flex justify-between text-base font-bold">
              <span>Total</span><span>{{ cart.total() | currency }}</span>
            </div>
          </div>
          <button class="btn-primary w-full py-3 text-base" [disabled]="cart.items().length === 0" (click)="showCheckout.set(true)">
            <app-icon name="card" [size]="18" /> Charge {{ cart.total() | currency }}
          </button>
        </div>
      </div>
    </div>

    @if (showCheckout()) {
      <app-checkout (cancel)="showCheckout.set(false)" (completed)="onCompleted($event)" />
    }

    @if (lastSale()) {
      <app-invoice [sale]="lastSale()!" (close)="lastSale.set(null)" />
    }
  `,
})
export class PosComponent implements OnInit, OnDestroy {
  private productSvc = inject(ProductService);
  private categorySvc = inject(CategoryService);
  cart = inject(CartService);
  private rt = inject(RealtimeService);
  private toast = inject(ToastService);
  private destroy$ = new Subject<void>();

  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(true);
  activeCategory = signal<number | null>(null);
  showCheckout = signal(false);
  lastSale = signal<Sale | null>(null);
  skeletons = Array.from({ length: 8 });

  search = new FormControl("", { nonNullable: true });

  ngOnInit(): void {
    this.categorySvc.list().subscribe((res) => this.categories.set(res.items));
    this.load();

    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.load());

    this.rt.stockUpdated$.pipe(takeUntil(this.destroy$)).subscribe(({ productId, stock }) => {
      this.products.update((list) => list.map((p) => (p.id === productId ? { ...p, stock } : p)));
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private load(): void {
    this.loading.set(true);
    this.productSvc
      .list({ page: 1, limit: 50, search: this.search.value || undefined, categoryId: this.activeCategory() ?? undefined })
      .subscribe({
        next: (res) => {
          this.products.set(res.items);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error("Failed to load products.");
        },
      });
  }

  filterCategory(id: number | null): void {
    this.activeCategory.set(id);
    this.load();
  }

  add(p: Product): void {
    const ok = this.cart.add(p);
    if (!ok) this.toast.error("Not enough stock available.");
  }

  onCompleted(sale: Sale): void {
    this.showCheckout.set(false);
    this.cart.clear();
    this.lastSale.set(sale);
    this.load();
  }
}
