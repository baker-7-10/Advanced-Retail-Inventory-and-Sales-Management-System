import { CurrencyPipe } from "@angular/common";
import { Component, OnDestroy, OnInit, computed, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from "rxjs";
import { Category, PaginationMeta, Product, ProductQuery } from "../../core/models";
import { CategoryService } from "../../core/services/category.service";
import { ProductService } from "../../core/services/product.service";
import { RealtimeService } from "../../core/services/realtime.service";
import { CartService } from "../../core/services/cart.service";
import { ToastService } from "../../core/services/toast.service";
import { IconComponent } from "../../shared/ui/icon.component";
import { ConfirmDialogComponent } from "../../shared/dialogs/confirm-dialog.component";
import { ProductFormComponent } from "./product-form.component";

@Component({
  selector: "app-products",
  standalone: true,
  imports: [CurrencyPipe, ReactiveFormsModule, IconComponent, ConfirmDialogComponent, ProductFormComponent],
  template: `
    <div class="space-y-5">
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold tracking-tight">Products</h2>
          <p class="text-sm text-muted-foreground">Manage your catalog, pricing, and stock levels.</p>
        </div>
        <button class="btn-primary" (click)="openCreate()">
          <app-icon name="plus" [size]="18" /> Add product
        </button>
      </div>

      <!-- Filters -->
      <div class="card p-4">
        <form [formGroup]="filters" class="grid gap-3 md:grid-cols-12">
          <div class="relative md:col-span-4">
            <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <app-icon name="search" [size]="18" />
            </span>
            <input class="input pl-10" formControlName="search" placeholder="Search by name or SKU…" />
          </div>

          <select class="input md:col-span-3" formControlName="categoryId">
            <option [ngValue]="''">All categories</option>
            @for (c of categories(); track c.id) {
              <option [ngValue]="c.id">{{ c.name }}</option>
            }
          </select>

          <input class="input md:col-span-2" type="number" min="0" formControlName="minPrice" placeholder="Min $" />
          <input class="input md:col-span-2" type="number" min="0" formControlName="maxPrice" placeholder="Max $" />

          <button type="button" class="btn-outline md:col-span-1" (click)="resetFilters()" title="Reset filters">
            <app-icon name="close" [size]="16" />
          </button>
        </form>
      </div>

      <!-- Table -->
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th class="px-4 py-3 font-semibold">Product</th>
                <th class="px-4 py-3 font-semibold">SKU</th>
                <th class="px-4 py-3 font-semibold">Category</th>
                <th class="cursor-pointer px-4 py-3 font-semibold" (click)="toggleSort('price')">
                  Price {{ sortIndicator('price') }}
                </th>
                <th class="cursor-pointer px-4 py-3 font-semibold" (click)="toggleSort('stock')">
                  Stock {{ sortIndicator('stock') }}
                </th>
                <th class="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                @for (i of skeletons; track i) {
                  <tr class="border-b border-border">
                    <td class="px-4 py-4" colspan="6">
                      <div class="h-5 w-full animate-pulse rounded bg-muted"></div>
                    </td>
                  </tr>
                }
              } @else if (products().length === 0) {
                <tr>
                  <td colspan="6" class="px-4 py-16 text-center">
                    <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <app-icon name="box" [size]="24" />
                    </div>
                    <p class="mt-3 font-medium">No products found</p>
                    <p class="text-sm text-muted-foreground">Try adjusting your filters or add a new product.</p>
                  </td>
                </tr>
              } @else {
                @for (p of products(); track p.id) {
                  <tr class="border-b border-border transition-colors hover:bg-muted/40">
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-3">
                        <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <app-icon name="package" [size]="18" />
                        </div>
                        <div class="min-w-0">
                          <p class="truncate font-medium text-foreground">{{ p.name }}</p>
                          @if (p.description) {
                            <p class="truncate text-xs text-muted-foreground">{{ p.description }}</p>
                          }
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3 font-mono text-xs text-muted-foreground">{{ p.sku }}</td>
                    <td class="px-4 py-3 text-muted-foreground">{{ categoryName()(p.categoryId) }}</td>
                    <td class="px-4 py-3 font-semibold">{{ p.price | currency }}</td>
                    <td class="px-4 py-3">
                      <span class="badge" [style.background]="stockBg(p)" [style.color]="stockColor(p)">
                        {{ p.stock }} in stock
                      </span>
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex justify-end gap-1">
                        <button class="btn-ghost px-2 py-1.5" (click)="openEdit(p)" title="Edit" aria-label="Edit product">
                          <app-icon name="edit" [size]="17" />
                        </button>
                        <button class="btn-ghost px-2 py-1.5" style="color: var(--danger)" (click)="askDelete(p)" title="Delete" aria-label="Delete product">
                          <app-icon name="trash" [size]="17" />
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        @if (meta(); as m) {
          <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
            <p class="text-muted-foreground">
              Showing {{ products().length }} of {{ m.total }} products
            </p>
            <div class="flex items-center gap-2">
              <button class="btn-outline px-3 py-1.5" [disabled]="m.page <= 1" (click)="goToPage(m.page - 1)">Prev</button>
              <span class="px-2 text-muted-foreground">Page {{ m.page }} / {{ m.totalPages || 1 }}</span>
              <button class="btn-outline px-3 py-1.5" [disabled]="m.page >= (m.totalPages || 1)" (click)="goToPage(m.page + 1)">Next</button>
            </div>
          </div>
        }
      </div>
    </div>

    @if (showForm()) {
      <app-product-form
        [product]="editing()"
        [categories]="categories()"
        (saved)="onSaved()"
        (cancel)="showForm.set(false)"
      />
    }

    @if (deleting()) {
      <app-confirm
        title="Delete product"
        [message]="'Are you sure you want to deactivate ' + deleting()!.name + '? This will remove it from the catalog.'"
        confirmLabel="Delete"
        [danger]="true"
        [busy]="deleteBusy()"
        (confirm)="confirmDelete()"
        (cancel)="deleting.set(null)"
      />
    }
  `,
})
export class ProductsComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private productSvc = inject(ProductService);
  private categorySvc = inject(CategoryService);
  private rt = inject(RealtimeService);
  private cart = inject(CartService);
  private toast = inject(ToastService);
  private destroy$ = new Subject<void>();

  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  meta = signal<PaginationMeta | null>(null);
  loading = signal(true);

  showForm = signal(false);
  editing = signal<Product | null>(null);
  deleting = signal<Product | null>(null);
  deleteBusy = signal(false);

  skeletons = Array.from({ length: 6 });

  private page = signal(1);
  private sortBy = signal<string>("");
  private order = signal<"ASC" | "DESC">("ASC");

  filters = this.fb.group({
    search: [""],
    categoryId: [""] as unknown as [string | number],
    minPrice: [null as number | null],
    maxPrice: [null as number | null],
  });

  categoryName = computed(() => {
    const map = new Map(this.categories().map((c) => [c.id, c.name]));
    return (id: number) => map.get(id) ?? "—";
  });

  ngOnInit(): void {
    this.categorySvc.list().subscribe((res) => this.categories.set(res.items));
    this.load();

    this.filters.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page.set(1);
        this.load();
      });

    this.rt.stockUpdated$.pipe(takeUntil(this.destroy$)).subscribe(({ productId, stock }) => {
      this.products.update((list) =>
        list.map((p) => (p.id === productId ? { ...p, stock } : p)),
      );
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private load(): void {
    this.loading.set(true);
    const f = this.filters.getRawValue();
    const query: ProductQuery = {
      page: this.page(),
      limit: 10,
      search: (f.search as string) || undefined,
      categoryId: f.categoryId ? Number(f.categoryId) : undefined,
      minPrice: f.minPrice ?? undefined,
      maxPrice: f.maxPrice ?? undefined,
      sortBy: this.sortBy() || undefined,
      order: this.sortBy() ? this.order() : undefined,
    };
    this.productSvc.list(query).subscribe({
      next: (res) => {
        this.products.set(res.items);
        this.meta.set(res.meta);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error("Failed to load products. Check that the API is running.");
      },
    });
  }

  goToPage(p: number): void {
    this.page.set(p);
    this.load();
  }

  toggleSort(field: string): void {
    if (this.sortBy() === field) {
      this.order.set(this.order() === "ASC" ? "DESC" : "ASC");
    } else {
      this.sortBy.set(field);
      this.order.set("ASC");
    }
    this.load();
  }

  sortIndicator(field: string): string {
    if (this.sortBy() !== field) return "";
    return this.order() === "ASC" ? "↑" : "↓";
  }

  resetFilters(): void {
    this.filters.reset({ search: "", categoryId: "" as never, minPrice: null, maxPrice: null });
  }

  openCreate(): void {
    this.editing.set(null);
    this.showForm.set(true);
  }

  openEdit(p: Product): void {
    this.editing.set(p);
    this.showForm.set(true);
  }

  onSaved(): void {
    this.showForm.set(false);
    this.load();
  }

  askDelete(p: Product): void {
    this.deleting.set(p);
  }

  confirmDelete(): void {
    const p = this.deleting();
    if (!p) return;
    this.deleteBusy.set(true);
    this.productSvc.deactivate(p.id).subscribe({
      next: () => {
        this.deleteBusy.set(false);
        this.deleting.set(null);
        this.toast.success("Product deactivated.");
        this.load();
      },
      error: () => {
        this.deleteBusy.set(false);
        this.toast.error("Could not delete product.");
      },
    });
  }

  stockColor(p: Product): string {
    const min = p.minimumStock ?? 10;
    if (p.stock <= 0) return "var(--danger)";
    if (p.stock <= min) return "var(--warning)";
    return "var(--success)";
  }

  stockBg(p: Product): string {
    const min = p.minimumStock ?? 10;
    if (p.stock <= 0) return "rgba(220,38,38,0.1)";
    if (p.stock <= min) return "rgba(217,119,6,0.12)";
    return "rgba(5,150,105,0.1)";
  }
}
