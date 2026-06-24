import { CurrencyPipe, DatePipe } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { Sale } from "../../core/models";
import { IconComponent } from "../../shared/icon.component";

@Component({
  selector: "app-invoice",
  standalone: true,
  imports: [CurrencyPipe, DatePipe, IconComponent],
  template: `
    <div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 print:static print:block print:bg-transparent print:p-0">
      <div class="my-8 w-full max-w-md print:my-0 print:max-w-none">
        <div class="mb-3 flex items-center justify-between print:hidden">
          <h3 class="text-lg font-semibold text-white">Receipt</h3>
          <div class="flex gap-2">
            <button class="btn-primary" (click)="print()">
              <app-icon name="printer" [size]="16" /> Print
            </button>
            <button class="btn-outline bg-white" (click)="close.emit()">Close</button>
          </div>
        </div>

        <div id="invoice-print" class="rounded-xl bg-card p-6 text-card-foreground shadow-xl print:rounded-none print:shadow-none">
          <div class="text-center">
            <div class="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <app-icon name="store" [size]="22" />
            </div>
            <h2 class="text-lg font-bold">Retail Store</h2>
            <p class="text-xs text-muted-foreground">123 Market Street · (555) 010-2030</p>
          </div>

          <div class="my-4 border-t border-dashed border-border"></div>

          <div class="flex justify-between text-xs text-muted-foreground">
            <span>Invoice #</span>
            <span class="font-mono">{{ sale.invoiceNumber || ('#' + sale.id) }}</span>
          </div>
          <div class="flex justify-between text-xs text-muted-foreground">
            <span>Date</span>
            <span>{{ sale.createdAt | date: 'medium' }}</span>
          </div>
          @if (sale.cashierName) {
            <div class="flex justify-between text-xs text-muted-foreground">
              <span>Cashier</span>
              <span>{{ sale.cashierName }}</span>
            </div>
          }

          <div class="my-4 border-t border-dashed border-border"></div>

          <table class="w-full text-sm">
            <tbody>
              @for (item of sale.items; track item.productId) {
                <tr>
                  <td class="py-1">
                    <span class="font-medium">{{ item.productName }}</span>
                    <span class="block text-xs text-muted-foreground">{{ item.quantity }} × {{ item.unitPrice | currency }}</span>
                  </td>
                  <td class="py-1 text-right align-top font-medium">{{ (item.quantity * item.unitPrice) | currency }}</td>
                </tr>
              }
            </tbody>
          </table>

          <div class="my-4 border-t border-dashed border-border"></div>

          <div class="space-y-1 text-sm">
            <div class="flex justify-between text-muted-foreground">
              <span>Subtotal</span><span>{{ sale.subtotal | currency }}</span>
            </div>
            @if (sale.tax) {
              <div class="flex justify-between text-muted-foreground">
                <span>Tax</span><span>{{ sale.tax | currency }}</span>
              </div>
            }
            @if (sale.discount) {
              <div class="flex justify-between text-muted-foreground">
                <span>Discount</span><span>-{{ sale.discount | currency }}</span>
              </div>
            }
            <div class="flex justify-between pt-1 text-base font-bold">
              <span>Total</span><span>{{ sale.total | currency }}</span>
            </div>
            @if (sale.paymentMethod) {
              <div class="flex justify-between text-muted-foreground">
                <span>Paid ({{ sale.paymentMethod }})</span><span>{{ sale.amountPaid ?? sale.total | currency }}</span>
              </div>
            }
            @if (changeDue() > 0) {
              <div class="flex justify-between font-medium">
                <span>Change</span><span>{{ changeDue() | currency }}</span>
              </div>
            }
          </div>

          <div class="my-4 border-t border-dashed border-border"></div>
          <p class="text-center text-xs text-muted-foreground">Thank you for your purchase!</p>
        </div>
      </div>
    </div>
  `,
})
export class InvoiceComponent {
  @Input({ required: true }) sale!: Sale;
  @Output() close = new EventEmitter<void>();

  changeDue(): number {
    const paid = this.sale.amountPaid ?? this.sale.total;
    return Math.max(0, paid - this.sale.total);
  }

  print(): void {
    window.print();
  }
}
