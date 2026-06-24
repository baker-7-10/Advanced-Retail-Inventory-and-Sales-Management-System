import { CurrencyPipe } from "@angular/common";
import { Component, EventEmitter, Output, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CartService } from "../../core/services/cart.service";
import { SaleService } from "../../core/services/sale.service";
import { ToastService } from "../../core/services/toast.service";
import { CreateSaleDto, PaymentMethod, Sale } from "../../core/models";
import { ModalComponent } from "../../shared/modal.component";
import { IconComponent } from "../../shared/icon.component";

@Component({
  selector: "app-checkout",
  standalone: true,
  imports: [CurrencyPipe, FormsModule, ModalComponent, IconComponent],
  template: `
    <app-modal title="Checkout" (close)="cancel.emit()">
      <div class="space-y-5 ">
        <div class="rounded-lg bg-muted/60 p-4 ">
          <div class="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal</span><span>{{ cart.subtotal() | currency }}</span>
          </div>
          <div class="mt-1 flex items-center justify-between text-sm text-muted-foreground">
            <span>Tax</span>
            <span>{{ cart.tax() | currency }}</span>
          </div>
          <div class="mt-1 flex items-center justify-between text-sm text-muted-foreground">
            <label for="discount">Discount %</label>
            <div class="flex items-center gap-1">
              <input id="discount" type="number" min="0" max="100" class="input h-8 w-24 py-1 text-right"
                [ngModel]="cart.discount()" (ngModelChange)="cart.setDiscount($event)" />
              <span>%</span>
            </div>
          </div>
          <div class="mt-3 flex justify-between border-t border-border pt-3 text-lg font-bold">
            <span>Total</span><span>{{ cart.total() | currency }}</span>
          </div>
        </div>

        <div>
          <label class="mb-2 block text-sm font-medium">Payment method</label>
          <div class="grid grid-cols-3 gap-2">
            @for (m of methods; track m.value) {
              <button type="button"
                class="flex flex-col items-center gap-1 rounded-lg border p-3 text-sm transition-colors"
                [class.border-primary]="method() === m.value"
                [class.bg-primary]="method() === m.value"
                [class.text-primary-foreground]="method() === m.value"
                [class.border-border]="method() !== m.value"
                (click)="method.set(m.value)">
                <app-icon [name]="m.icon" [size]="20" />
                {{ m.label }}
              </button>
            }
          </div>
        </div>

        @if (method() === 'cash') {
          <div>
            <label for="paid" class="mb-1 block text-sm font-medium">Amount tendered</label>
            <input id="paid" type="number" min="0" class="input" [ngModel]="amountPaid()" (ngModelChange)="amountPaid.set($event)" placeholder="0.00" />
            @if (change() !== null) {
              <p class="mt-2 text-sm" [class.text-danger]="change()! < 0">
                @if (change()! >= 0) {
                  Change due: <span class="font-semibold">{{ change() | currency }}</span>
                } @else {
                  Insufficient amount
                }
              </p>
            }
          </div>
        }
      </div>

      <div footer class="flex justify-end gap-2 mt-4" >
        <button class="btn-outline" (click)="cancel.emit()" [disabled]="busy()">Cancel</button>
        <button class="btn-primary min-w-32" (click)="complete()" [disabled]="busy() || !canComplete()">
          @if (busy()) { Processing… } @else { Complete sale }
        </button>
      </div>
    </app-modal>
  `,
})
export class CheckoutComponent {
  cart = inject(CartService);
  private saleSvc = inject(SaleService);
  private toast = inject(ToastService);

  @Output() cancel = new EventEmitter<void>();
  @Output() completed = new EventEmitter<Sale>();

  method = signal<PaymentMethod>("cash");
  amountPaid = signal<number | null>(null);
  busy = signal(false);

  methods: { value: PaymentMethod; label: string; icon: "cash" | "card" | "wallet" }[] = [
    { value: "cash", label: "Cash", icon: "cash" },
    { value: "card", label: "Card", icon: "card" },
    { value: "transfer", label: "Mobile", icon: "wallet" },
  ];

  change = computed(() => {
    if (this.method() !== "cash" || this.amountPaid() === null) return null;
    return (this.amountPaid() as number) - this.cart.total();
  });

  canComplete = computed(() => {
    if (this.cart.items().length === 0) return false;
    if (this.method() === "cash") return (this.amountPaid() ?? 0) >= this.cart.total();
    return true;
  });

  complete(): void {
    this.busy.set(true);
    const payload: CreateSaleDto = {
      items: this.cart.items().map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      discountPercent: this.cart.discount() || undefined,
    };
    this.saleSvc.checkout(payload).subscribe({
      next: (sale) => {
        this.busy.set(false);
        this.toast.success("Sale completed successfully.");
        this.completed.emit(sale);
      },
      error: () => {
        this.busy.set(false);
        this.toast.error("Failed to process sale.");
      },
    });
  }
}
