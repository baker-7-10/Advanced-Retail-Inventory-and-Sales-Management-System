import { CurrencyPipe } from "@angular/common";
import { Component, OnDestroy, OnInit, inject, signal } from "@angular/core";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from "rxjs";
import { Category, PaginationMeta, Product, Sale } from "../../core/models";
import { CategoryService } from "../../core/services/category.service";
import { ProductService } from "../../core/services/product.service";
import { CartService } from "../../core/services/cart.service";
import { RealtimeService } from "../../core/services/realtime.service";
import { ToastService } from "../../core/services/toast.service";
import { IconComponent } from "../../shared/ui/icon.component";
import { CheckoutComponent } from "./checkout.component";
import { InvoiceComponent } from "./invoice.component";

@Component({
  selector: "app-pos",
  standalone: true,
  imports: [CurrencyPipe, ReactiveFormsModule, IconComponent, CheckoutComponent, InvoiceComponent],
styles: [`
  :host { display: block; height: 100%; overflow: hidden; }

  /* Custom scrollbar (no Tailwind equivalent) */
  .thin-scroll::-webkit-scrollbar { height: 4px; width: 4px; }
  .thin-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
  .thin-scroll::-webkit-scrollbar-track { background: transparent; }
  @media (hover: none) { .thin-scroll::-webkit-scrollbar { height: 0; width: 0; } }

  /* -webkit-line-clamp (no Tailwind equivalent on older versions) */
  .clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Pulse skeleton */
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  .skeleton { animation: pulse 2s infinite; }
`],


// ─── Template ─────────────────────────────────────────────────────────────────
template: `

  <!-- ═══════════════════════════════════════
       MAIN GRID  (catalog  |  cart sidebar)
  ═══════════════════════════════════════ -->
  <div class="grid grid-cols-[1fr_360px] max-lg:grid-cols-1 h-full overflow-hidden">

    <!-- ── Catalog pane ── -->
    <div class="grid grid-rows-[auto_1fr] min-w-0 overflow-hidden pr-4">

      <!-- Toolbar: search + category pills -->
      <div class="grid grid-cols-[280px_1fr] max-sm:grid-cols-1 items-center gap-2 py-3">

        <!-- Search -->
        <div class="relative min-w-0">
          <span class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
            <app-icon name="search" [size]="15" />
          </span>
          <input
            class="input w-full h-9 pl-8 text-sm"
            [formControl]="search"
            placeholder="Search or scan SKU…"
          />
        </div>

        <!-- Category pills -->
        <div class="flex gap-1 overflow-x-auto thin-scroll pb-0.5 min-w-0">
          <button
            class="whitespace-nowrap px-2.5 py-1 text-[11px] rounded-full border transition-colors duration-150 cursor-pointer"
            [class.bg-primary]="activeCategory()===null"
            [class.text-primary-foreground]="activeCategory()===null"
            [class.border-primary]="activeCategory()===null"
            [class.bg-transparent]="activeCategory()!==null"
            [class.border-border]="activeCategory()!==null"
            (click)="filterCategory(null)">
            All
          </button>
          @for (c of categories(); track c.id) {
            <button
              class="whitespace-nowrap px-2.5 py-1 text-[11px] rounded-full border transition-colors duration-150 cursor-pointer"
              [class.bg-primary]="activeCategory()===c.id"
              [class.text-primary-foreground]="activeCategory()===c.id"
              [class.border-primary]="activeCategory()===c.id"
              [class.bg-transparent]="activeCategory()!==c.id"
              [class.border-border]="activeCategory()!==c.id"
              (click)="filterCategory(c.id)">
              {{ c.name }}
            </button>
          }
        </div>
      </div>

      <!-- Scrollable product area (vertical only) -->
      <div class="overflow-y-auto overflow-x-hidden min-h-0 w-full pb-3 thin-scroll">

        @if (loading()) {
          <!-- Skeleton loader — centered -->
          <div class="flex flex-wrap justify-center gap-3 content-start w-full">
            @for (i of skeletons; track i) {
              <div class="skeleton w-[160px] h-[210px] rounded-2xl bg-muted flex-shrink-0"></div>
            }
          </div>

        } @else if (products().length === 0) {
          <div class="flex h-[200px] flex-col items-center justify-center text-center text-muted-foreground gap-2">
            <app-icon name="box" [size]="32" />
            <p class="text-sm">No products available</p>
          </div>

        } @else {
          <div class="flex flex-wrap  gap-3 content-start w-full">
            @for (p of products(); track p.id) {

              <button
                class="group relative flex flex-col w-[160px] rounded-2xl bg-card border border-border
                       overflow-hidden cursor-pointer transition-all duration-200 flex-shrink-0
                       hover:-translate-y-1 hover:shadow-lg hover:border-primary/40
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                [disabled]="p.stock <= 0"
                (click)="add(p)">

                <!-- Icon area — hover tints to primary -->
                <div class="flex items-center justify-center h-[100px] w-full
                            bg-gradient-to-br from-muted to-muted/60
                            text-muted-foreground transition-colors duration-200
                            group-hover:from-primary/10 group-hover:to-primary/5
                            group-hover:text-primary">
                  <app-icon name="package" [size]="28" />
                </div>

                <!-- Info -->
                <div class="flex flex-col gap-1.5 p-3 flex-1 w-full text-left">
                  <span class="clamp-2 text-[12px] leading-[1.3] font-medium text-foreground">
                    {{ p.name }}
                  </span>

                  <div class="flex items-center justify-between mt-auto pt-1">
                    <span class="text-[13px] font-bold text-primary">
                      {{ p.price | currency }}
                    </span>

                    <!-- ✅ FIX: stock badge uses slate/muted palette — no green -->
                    @if (p.stock <= 5 && p.stock > 0) {
                      <span class="text-[10px] font-medium
                                   text-muted-foreground bg-muted
                                   px-1.5 py-0.5 rounded-full border border-border">
                        {{ p.stock }} left
                      </span>
                    }
                    @if (p.stock <= 0) {
                      <span class="text-[10px] font-medium
                                   text-destructive/80 bg-destructive/10
                                   px-1.5 py-0.5 rounded-full">
                        Out
                      </span>
                    }
                  </div>
                </div>

                <!-- ✅ REMOVED: hover "Add" pill overlay — gone entirely -->

              </button>
            }
          </div>

          <!-- Pagination -->
          @if (meta(); as m) {
            <div class="flex items-center justify-between border-t border-border pt-3 mt-2 text-[13px]">
              <p class="text-muted-foreground">
                Showing {{ products().length }} of {{ m.total }} products
              </p>
              <div class="flex items-center gap-2">
                <button
                  class="btn-outline px-3 py-1.5 text-[13px]"
                  [disabled]="m.page <= 1"
                  (click)="goToPage(m.page - 1)">
                  Prev
                </button>
                <span class="text-muted-foreground whitespace-nowrap">
                  {{ m.page }} / {{ m.totalPages || 1 }}
                </span>
                <button
                  class="btn-outline px-3 py-1.5 text-[13px]"
                  [disabled]="m.page >= (m.totalPages || 1)"
                  (click)="goToPage(m.page + 1)">
                  Next
                </button>
              </div>
            </div>
          }
        }

      </div>
    </div>
    <!-- /catalog pane -->


    <!-- ── Cart sidebar (desktop) ── -->
    <div class="grid grid-rows-[auto_1fr_auto] overflow-hidden bg-card border-l border-border max-lg:hidden">

      <!-- Row 1: header -->
      <div class="flex items-center justify-between border-b border-border px-4 py-3.5 shrink-0">
        <span class="flex items-center gap-2 text-sm font-semibold">
          <app-icon name="cart" [size]="16" /> Current sale
        </span>
        @if (cart.items().length > 0) {
          <button
            class="btn-ghost px-2 py-1 text-xs font-medium text-destructive"
            (click)="cart.clear()">
            Clear
          </button>
        }
      </div>

      <!-- Row 2: scrollable items -->
      <div class="overflow-y-auto min-h-0 px-3 py-2 flex flex-col gap-1.5 thin-scroll">
        @if (cart.items().length === 0) {
          <div class="flex h-full flex-col items-center justify-center text-center text-muted-foreground gap-1">
            <app-icon name="cart" [size]="32" />
            <p class="text-sm font-medium mt-2">Cart is empty</p>
            <p class="text-xs">Tap a product to add it</p>
          </div>
        } @else {
          @for (item of cart.items(); track item.product.id) {
            <div class="grid grid-cols-[1fr_auto_80px] items-center gap-2
                        rounded-lg bg-muted/40 px-3 py-2.5">
              <div class="min-w-0">
                <p class="clamp-2 text-[13px] font-medium leading-snug">{{ item.product.name }}</p>
                <p class="text-[11px] text-muted-foreground mt-0.5">{{ item.product.price | currency }} / each</p>
              </div>
              <div class="flex items-center gap-1">
                <button
                  class="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-border
                         bg-card text-muted-foreground transition-colors
                         hover:bg-muted hover:text-foreground
                         disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  (click)="cart.decrement(item.product.id)" aria-label="Decrease">
                  <app-icon name="minus" [size]="13" />
                </button>
                <span class="flex h-[26px] w-7 items-center justify-center text-[13px] font-semibold tabular-nums">
                  {{ item.quantity }}
                </span>
                <button
                  class="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-border
                         bg-card text-muted-foreground transition-colors
                         hover:bg-muted hover:text-foreground
                         disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  [disabled]="item.quantity >= item.product.stock"
                  (click)="cart.increment(item.product.id)" aria-label="Increase">
                  <app-icon name="plus" [size]="13" />
                </button>
              </div>
              <span class="text-right text-[13px] font-semibold tabular-nums">
                {{ item.product.price * item.quantity | currency }}
              </span>
            </div>
          }
        }
      </div>

      <!-- Row 3: totals + charge button -->
      @if (cart.items().length > 0) {
        <div class="border-t border-border px-4 py-3.5 shrink-0">
          <div class="flex flex-col gap-1.5 text-[13px] mb-3">
            <div class="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span class="tabular-nums">{{ cart.subtotal() | currency }}</span>
            </div>
            <div class="flex justify-between text-muted-foreground">
              <span>Tax</span>
              <span class="tabular-nums">{{ cart.tax() | currency }}</span>
            </div>
            <div class="flex justify-between border-t border-border pt-2 text-[15px] font-bold">
              <span>Total</span>
              <span class="tabular-nums">{{ cart.total() | currency }}</span>
            </div>
          </div>
          <button
            class="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-1.5"
            [disabled]="cart.items().length === 0"
            (click)="showCheckout.set(true)">
            <app-icon name="card" [size]="16" />
            Charge {{ cart.total() | currency }}
          </button>
        </div>
      }

    </div>
    <!-- /cart sidebar -->

  </div>
  <!-- /main grid -->


  <!-- ═══════════════════════════════════════
       MOBILE BOTTOM BAR
  ═══════════════════════════════════════ -->
  @if (cart.items().length > 0) {
    <div
      class="lg:hidden fixed bottom-0 left-0 right-0 z-40
             grid grid-cols-[auto_auto_1fr_auto_auto] items-center gap-3
             border-t border-border bg-card px-4 py-3
             shadow-[0_-4px_12px_rgba(0,0,0,.08)]"
      (click)="mobileCartOpen.set(true)">
      <app-icon name="cart" [size]="18" />
      <span class="text-sm font-bold tabular-nums">{{ cart.items().length }}</span>
      <span class="text-[13px] text-muted-foreground">
        item{{ cart.items().length !== 1 ? 's' : '' }}
      </span>
      <span class="text-sm font-bold tabular-nums">{{ cart.total() | currency }}</span>
      <button class="btn-primary px-3.5 py-2 text-[13px]">View Cart</button>
    </div>
  }


  <!-- ═══════════════════════════════════════
       MOBILE CART OVERLAY
  ═══════════════════════════════════════ -->
  @if (mobileCartOpen()) {
    <div class="lg:hidden fixed inset-0 z-50 grid grid-rows-[auto_1fr_auto] bg-background">

      <!-- header -->
      <div class="flex items-center justify-between border-b border-border px-4 py-3.5">
        <span class="flex items-center gap-2 text-sm font-semibold">
          <app-icon name="cart" [size]="16" /> Current sale
        </span>
        <div class="flex items-center gap-2">
          @if (cart.items().length > 0) {
            <button
              class="btn-ghost px-2 py-1 text-xs font-medium text-destructive"
              (click)="clearCart()">
              Clear
            </button>
          }
          <button
            class="btn-ghost p-1.5 rounded-md"
            (click)="mobileCartOpen.set(false)">
            <app-icon name="close" [size]="18" />
          </button>
        </div>
      </div>

      <!-- scrollable items -->
      <div class="overflow-y-auto min-h-0 px-4 py-2 flex flex-col gap-1.5 thin-scroll">
        @if (cart.items().length === 0) {
          <div class="flex h-full flex-col items-center justify-center text-center text-muted-foreground gap-1">
            <app-icon name="cart" [size]="32" />
            <p class="text-sm font-medium mt-2">Cart is empty</p>
            <p class="text-xs">Tap a product to add it</p>
          </div>
        } @else {
          @for (item of cart.items(); track item.product.id) {
            <div class="grid grid-cols-[1fr_auto_80px] items-center gap-2
                        rounded-lg bg-muted/40 px-3 py-2.5">
              <div class="min-w-0">
                <p class="clamp-2 break-all text-[13px] font-medium leading-snug">{{ item.product.name }}</p>
                <p class="text-[11px] text-muted-foreground mt-0.5">{{ item.product.price | currency }} / each</p>
              </div>
              <div class="flex items-center gap-1">
                <button
                  class="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-border
                         bg-card text-muted-foreground transition-colors
                         hover:bg-muted hover:text-foreground cursor-pointer"
                  (click)="cart.decrement(item.product.id)">
                  <app-icon name="minus" [size]="13" />
                </button>
                <span class="flex h-[26px] w-7 items-center justify-center text-[13px] font-semibold tabular-nums">
                  {{ item.quantity }}
                </span>
                <button
                  class="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-border
                         bg-card text-muted-foreground transition-colors
                         hover:bg-muted hover:text-foreground
                         disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  [disabled]="item.quantity >= item.product.stock"
                  (click)="cart.increment(item.product.id)">
                  <app-icon name="plus" [size]="13" />
                </button>
              </div>
              <span class="text-right text-[13px] font-semibold tabular-nums">
                {{ item.product.price * item.quantity | currency }}
              </span>
            </div>
          }
        }
      </div>

      <!-- totals + charge -->
      @if (cart.items().length > 0) {
        <div class="border-t border-border px-4 py-3.5 shrink-0">
          <div class="flex flex-col gap-1.5 text-[13px] mb-3">
            <div class="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span class="tabular-nums">{{ cart.subtotal() | currency }}</span>
            </div>
            <div class="flex justify-between text-muted-foreground">
              <span>Tax</span>
              <span class="tabular-nums">{{ cart.tax() | currency }}</span>
            </div>
            <div class="flex justify-between border-t border-border pt-2 text-[15px] font-bold">
              <span>Total</span>
              <span class="tabular-nums">{{ cart.total() | currency }}</span>
            </div>
          </div>
          <button
            class="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-1.5"
            [disabled]="cart.items().length === 0"
            (click)="mobileCartOpen.set(false); showCheckout.set(true)">
            <app-icon name="card" [size]="16" />
            Charge {{ cart.total() | currency }}
          </button>
        </div>
      }

    </div>
  }


  @if (showCheckout()) {
    <app-checkout (cancel)="showCheckout.set(false)" (completed)="onCompleted($event)" />
  }

  @if (lastSale()) {
    <app-invoice [sale]="lastSale()!" (close)="lastSale.set(null)" />
  }
` })
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
  page = signal(1);
  meta = signal<PaginationMeta | null>(null);
  showCheckout = signal(false);
  lastSale = signal<Sale | null>(null);
  skeletons = Array.from({ length: 8 });
  mobileCartOpen = signal(false);
  private load$ = new Subject<void>();

  search = new FormControl("", { nonNullable: true });

  ngOnInit(): void {
    this.categorySvc.list().subscribe({
      next: (res) => this.categories.set(res.items),
      error: () => this.toast.error("Failed to load categories."),
    });

    this.load$
      .pipe(
        switchMap(() => {
          this.loading.set(true);
          return this.productSvc.list({
            page: this.page(),
            limit: 20,
            search: this.search.value || undefined,
            categoryId: this.activeCategory() ?? undefined,
          });
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (res) => {
          this.products.set(res.items);
          this.meta.set(res.meta);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error("Failed to load products.");
        },
      });

    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page.set(1);
        this.load$.next();
      });

    this.rt.stockUpdated$.pipe(takeUntil(this.destroy$)).subscribe(({ productId, stock }) => {
      this.products.update((list) => list.map((p) => (p.id === productId ? { ...p, stock } : p)));
      this.cart.syncStock(productId, stock);
    });

    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private load(): void {
    this.load$.next();
  }

  filterCategory(id: number | null): void {
    this.activeCategory.set(id);
    this.page.set(1);
    this.load();
  }

  goToPage(p: number): void {
    this.page.set(p);
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
