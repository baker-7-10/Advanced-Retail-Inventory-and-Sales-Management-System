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
    <div class="h-[calc(100vh-9rem)] w-full overflow-hidden lg:grid lg:grid-cols-[3fr_2fr] lg:gap-4">
      <!-- Product catalog -->
      <div class="flex h-full min-h-0 flex-col">
        <div class="mb-2 flex flex-wrap items-center gap-1.5">
          <div class="relative max-w-72 flex-1">
            <span class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              <app-icon name="search" [size]="15" />
            </span>
            <input class="input h-9 pl-8 text-sm" [formControl]="search" placeholder="Search or scan SKU…" />
          </div>
          <div class="flex gap-1 overflow-x-auto">
            <button class="badge whitespace-nowrap border px-2 py-1 text-[11px]"
              [class.bg-primary]="activeCategory() === null" [class.text-primary-foreground]="activeCategory() === null"
              [class.border-border]="activeCategory() !== null"
              (click)="filterCategory(null)">All</button>
            @for (c of categories(); track c.id) {
              <button class="badge whitespace-nowrap border px-2 py-1 text-[11px]"
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
                <div class="h-24 animate-pulse rounded-lg bg-muted"></div>
              }
            </div>
          } @else if (products().length === 0) {
            <div class="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <app-icon name="box" [size]="28" />
              <p class="mt-2 text-sm">No products available</p>
            </div>
          } @else {
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              @for (p of products(); track p.id) {
                <button
                  class="card flex min-w-0 flex-col items-start gap-1 overflow-hidden p-2.5 text-left transition-all hover:border-primary hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                  [disabled]="p.stock <= 0"
                  (click)="add(p)">
                  <div class="flex w-full items-start justify-between">
                    <div class="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <app-icon name="package" [size]="14" />
                    </div>
                    <span class="badge text-[10px] px-1.5 py-0.5" [style.background]="p.stock <= 0 ? 'rgba(220,38,38,0.1)' : 'var(--muted)'"
                      [style.color]="p.stock <= 0 ? 'var(--danger)' : 'var(--muted-foreground)'">
                      {{ p.stock <= 0 ? 'Out' : p.stock }}
                    </span>
                  </div>
                  <p class="mt-0.5 line-clamp-2 break-all text-xs font-medium leading-snug">{{ p.name }}</p>
                  <p class="text-xs font-semibold text-primary">{{ p.price | currency }}</p>
                </button>
              }
            </div>
          }
        </div>
      </div>

      <!-- Desktop cart sidebar -->
      <div class="hidden h-full flex-col lg:flex">
        <div class="card flex h-full flex-col overflow-hidden">
          <div class="flex-shrink-0 flex items-center justify-between border-b border-border px-4 py-3.5">
            <h3 class="flex items-center gap-2 text-sm font-semibold">
              <app-icon name="cart" [size]="16" /> Current sale
            </h3>
            @if (cart.items().length > 0) {
              <button class="btn-ghost rounded-md px-2 py-1 text-xs font-medium" style="color: var(--danger)" (click)="cart.clear()">Clear</button>
            }
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto px-3 py-2">
            @if (cart.items().length === 0) {
              <div class="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                <app-icon name="cart" [size]="28" />
                <p class="mt-3 text-sm font-medium">Cart is empty</p>
                <p class="mt-0.5 text-xs">Tap a product to add it</p>
              </div>
            } @else {
              <div class="space-y-1.5">
                @for (item of cart.items(); track item.product.id) {
                  <div class="flex min-w-0 items-center gap-2.5 rounded-lg bg-muted/40 px-3 py-2.5">
                    <div class="min-w-0 flex-1">
<p class="line-clamp-2 w-full break-all text-sm font-medium leading-tight">{{ item.product.name }}</p>
                      <p class="mt-0.5 text-xs text-muted-foreground">{{ item.product.price | currency }} / each</p>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <button class="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" (click)="cart.decrement(item.product.id)" aria-label="Decrease">
                        <app-icon name="minus" [size]="13" />
                      </button>
                      <span class="flex h-7 w-8 items-center justify-center text-sm font-semibold tabular-nums">{{ item.quantity }}</span>
                      <button class="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40" [disabled]="item.quantity >= item.product.stock" (click)="cart.increment(item.product.id)" aria-label="Increase">
                        <app-icon name="plus" [size]="13" />
                      </button>
                    </div>
                    <div class="w-20 text-right text-sm font-semibold tabular-nums">{{ item.product.price * item.quantity | currency }}</div>
                  </div>
                }
              </div>
            }
          </div>

          @if (cart.items().length > 0) {
            <div class="flex-shrink-0 border-t border-border px-4 py-3.5">
              <div class="mb-3 space-y-1.5 text-sm">
                <div class="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span class="tabular-nums">{{ cart.subtotal() | currency }}</span>
                </div>
                <div class="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span class="tabular-nums">{{ cart.tax() | currency }}</span>
                </div>
                <div class="flex justify-between border-t border-border pt-1.5 text-base font-bold">
                  <span>Total</span>
                  <span class="tabular-nums">{{ cart.total() | currency }}</span>
                </div>
              </div>
              <button class="btn-primary w-full py-2.5 text-sm" [disabled]="cart.items().length === 0" (click)="showCheckout.set(true)">
                <app-icon name="card" [size]="16" /> Charge {{ cart.total() | currency }}
              </button>
            </div>
          }
        </div>
      </div>

      <!-- Mobile bottom bar -->
      @if (cart.items().length > 0) {
        <div class="flex items-center gap-3 border-t border-border bg-card px-4 py-3 lg:hidden" (click)="mobileCartOpen.set(true)">
          <app-icon name="cart" [size]="18" />
          <span class="text-sm font-semibold tabular-nums">{{ cart.items().length }}</span>
          <span class="flex-1 text-sm text-muted-foreground">item{{ cart.items().length !== 1 ? 's' : '' }}</span>
          <span class="text-sm font-bold tabular-nums">{{ cart.total() | currency }}</span>
          <button class="btn-primary py-2 text-sm">View Cart</button>
        </div>
      }

      <!-- Mobile cart overlay -->
      @if (mobileCartOpen()) {
        <div class="fixed inset-0 z-50 flex flex-col bg-background lg:hidden">
          <div class="flex-shrink-0 flex items-center justify-between border-b border-border px-4 py-3.5">
            <h3 class="flex items-center gap-2 text-sm font-semibold">
              <app-icon name="cart" [size]="16" /> Current sale
            </h3>
            <div class="flex items-center gap-2">
              @if (cart.items().length > 0) {
                <button class="btn-ghost rounded-md px-2 py-1 text-xs font-medium" style="color: var(--danger)" (click)="clearCart()">Clear</button>
              }
              <button class="btn-ghost rounded-md p-1.5" (click)="mobileCartOpen.set(false)">
                <app-icon name="close" [size]="18" />
              </button>
            </div>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto px-4 py-2">
            @if (cart.items().length === 0) {
              <div class="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                <app-icon name="cart" [size]="28" />
                <p class="mt-3 text-sm font-medium">Cart is empty</p>
                <p class="mt-0.5 text-xs">Tap a product to add it</p>
              </div>
            } @else {
              <div class="space-y-1.5">
                @for (item of cart.items(); track item.product.id) {
                  <div class="flex min-w-0 items-center gap-2.5 rounded-lg bg-muted/40 px-3 py-2.5">
                    <div class="min-w-0 flex-1">
                      <p class="line-clamp-2 w-full break-all text-sm font-medium leading-tight">{{ item.product.name }}</p>
                      <p class="mt-0.5 text-xs text-muted-foreground">{{ item.product.price | currency }} / each</p>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <button class="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" (click)="cart.decrement(item.product.id)" aria-label="Decrease">
                        <app-icon name="minus" [size]="13" />
                      </button>
                      <span class="flex h-7 w-8 items-center justify-center text-sm font-semibold tabular-nums">{{ item.quantity }}</span>
                      <button class="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40" [disabled]="item.quantity >= item.product.stock" (click)="cart.increment(item.product.id)" aria-label="Increase">
                        <app-icon name="plus" [size]="13" />
                      </button>
                    </div>
                    <div class="w-20 text-right text-sm font-semibold tabular-nums">{{ item.product.price * item.quantity | currency }}</div>
                  </div>
                }
              </div>
            }
          </div>

          @if (cart.items().length > 0) {
            <div class="flex-shrink-0 border-t border-border px-4 py-3.5">
              <div class="mb-3 space-y-1.5 text-sm">
                <div class="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span class="tabular-nums">{{ cart.subtotal() | currency }}</span>
                </div>
                <div class="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span class="tabular-nums">{{ cart.tax() | currency }}</span>
                </div>
                <div class="flex justify-between border-t border-border pt-1.5 text-base font-bold">
                  <span>Total</span>
                  <span class="tabular-nums">{{ cart.total() | currency }}</span>
                </div>
              </div>
              <button class="btn-primary w-full py-2.5 text-sm" [disabled]="cart.items().length === 0" (click)="mobileCartOpen.set(false); showCheckout.set(true)">
                <app-icon name="card" [size]="16" /> Charge {{ cart.total() | currency }}
              </button>
            </div>
          }
        </div>
      }
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
  mobileCartOpen = signal(false);

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
    this.mobileCartOpen.set(false);
    this.cart.clear();
    this.lastSale.set(sale);
    this.load();
  }

  clearCart(): void {
    this.cart.clear();
    this.mobileCartOpen.set(false);
  }
}
