import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { HttpErrorResponse } from "@angular/common/http";
import { Category, CreateProductDto, Product } from "../../core/models";
import { ProductService } from "../../core/services/product.service";
import { ToastService } from "../../core/services/toast.service";
import { ModalComponent } from "../../shared/modal.component";

@Component({
  selector: "app-product-form",
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent],
  template: `
    <app-modal [title]="product ? 'Edit product' : 'New product'" (close)="cancel.emit()">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
        <div>
          <label class="label" for="name">Product name</label>
          <input id="name" class="input" formControlName="name" placeholder="Samsung Galaxy S24" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label" for="sku">SKU</label>
            <input id="sku" class="input font-mono" formControlName="sku" placeholder="SAM-S24-BLK" />
          </div>
          <div>
            <label class="label" for="category">Category</label>
            <select id="category" class="input" formControlName="categoryId">
              <option [ngValue]="null" disabled>Select category</option>
              @for (c of categories; track c.id) {
                <option [ngValue]="c.id">{{ c.name }}</option>
              }
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label" for="price">Price ($)</label>
            <input id="price" type="number" step="0.01" min="0" class="input" formControlName="price" placeholder="999.99" />
          </div>
          <div>
            <label class="label" for="stock">Stock quantity</label>
            <input id="stock" type="number" min="0" class="input" formControlName="stock" placeholder="50" />
          </div>
        </div>

        <div>
          <label class="label" for="description">Description</label>
          <textarea id="description" rows="3" class="input resize-none" formControlName="description" placeholder="Short product description"></textarea>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="btn-outline" (click)="cancel.emit()">Cancel</button>
          <button type="submit" class="btn-primary" [disabled]="saving()">
            @if (saving()) {
              <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
            }
            {{ product ? "Save changes" : "Create product" }}
          </button>
        </div>
      </form>
    </app-modal>
  `,
})
export class ProductFormComponent implements OnInit {
  @Input() product: Product | null = null;
  @Input() categories: Category[] = [];
  @Output() saved = new EventEmitter<Product>();
  @Output() cancel = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private products = inject(ProductService);
  private toast = inject(ToastService);

  saving = signal(false);

  form = this.fb.group({
    name: ["", [Validators.required, Validators.minLength(2)]],
    sku: ["", [Validators.required]],
    categoryId: [null as number | null, [Validators.required]],
    price: [0, [Validators.required, Validators.min(0)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    description: [""],
  });

  ngOnInit(): void {
    if (this.product) {
      this.form.patchValue({
        name: this.product.name,
        sku: this.product.sku,
        categoryId: this.product.categoryId,
        price: this.product.price,
        stock: this.product.stock,
        description: this.product.description ?? "",
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning("Please fill in all required fields.");
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const dto: CreateProductDto = {
      name: raw.name!,
      sku: raw.sku!,
      categoryId: raw.categoryId!,
      price: Number(raw.price),
      stock: Number(raw.stock),
      description: raw.description || undefined,
    };

    const req = this.product
      ? this.products.update(this.product.id, dto)
      : this.products.create(dto);

    req.subscribe({
      next: (p) => {
        this.saving.set(false);
        this.toast.success(this.product ? "Product updated." : "Product created.");
        this.saved.emit(p);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        if (err.status === 409) this.toast.error("SKU already exists.");
        else this.toast.error(this.apiMsg(err) ?? "Could not save product.");
      },
    });
  }

  private apiMsg(err: HttpErrorResponse): string | null {
    const msg = (err.error as { message?: string | string[] })?.message;
    return Array.isArray(msg) ? msg.join(", ") : (msg ?? null);
  }
}
