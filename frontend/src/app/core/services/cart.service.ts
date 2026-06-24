import { Injectable, computed, signal } from "@angular/core";
import { Product } from "../models";

export interface CartLine {
  product: Product;
  quantity: number;
}

const TAX_RATE = 0;

@Injectable({ providedIn: "root" })
export class CartService {
  private readonly _lines = signal<CartLine[]>([]);
  private readonly _discount = signal(0);

  readonly lines = this._lines.asReadonly();
  readonly items = this._lines.asReadonly();
  readonly discount = this._discount.asReadonly();

  readonly count = computed(() =>
    this._lines().reduce((sum, l) => sum + l.quantity, 0),
  );

  readonly subtotal = computed(() =>
    this._lines().reduce((sum, l) => sum + l.product.price * l.quantity, 0),
  );

  readonly taxRate = () => TAX_RATE;

  readonly tax = computed(() => this.subtotal() * TAX_RATE);

  readonly total = computed(() => this.subtotal() + this.tax() - this._discount());

  readonly isEmpty = computed(() => this._lines().length === 0);

  setDiscount(value: number | string | null): void {
    this._discount.set(Math.max(0, Number(value) || 0));
  }

  add(product: Product, quantity = 1): boolean {
    if (product.stock <= 0) return false;
    this._lines.update((lines) => {
      const existing = lines.find((l) => l.product.id === product.id);
      if (existing) {
        const next = Math.min(existing.quantity + quantity, product.stock);
        return lines.map((l) =>
          l.product.id === product.id ? { ...l, quantity: next } : l,
        );
      }
      return [...lines, { product, quantity: Math.min(quantity, product.stock) }];
    });
    return true;
  }

  setQuantity(productId: number, quantity: number): void {
    this._lines.update((lines) =>
      lines
        .map((l) => {
          if (l.product.id !== productId) return l;
          const capped = Math.max(0, Math.min(quantity, l.product.stock));
          return { ...l, quantity: capped };
        })
        .filter((l) => l.quantity > 0),
    );
  }

  increment(productId: number): void {
    const line = this._lines().find((l) => l.product.id === productId);
    if (line) this.setQuantity(productId, line.quantity + 1);
  }

  decrement(productId: number): void {
    const line = this._lines().find((l) => l.product.id === productId);
    if (line) this.setQuantity(productId, line.quantity - 1);
  }

  remove(productId: number): void {
    this._lines.update((lines) => lines.filter((l) => l.product.id !== productId));
  }

  clear(): void {
    this._lines.set([]);
    this._discount.set(0);
  }

  syncStock(productId: number, stock: number): void {
    this._lines.update((lines) =>
      lines
        .map((l) =>
          l.product.id === productId
            ? {
                product: { ...l.product, stock },
                quantity: Math.min(l.quantity, stock),
              }
            : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }
}
