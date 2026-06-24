import { Component, OnInit, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Category, CreateCategoryDto } from "../../core/models";
import { CategoryService } from "../../core/services/category.service";
import { ToastService } from "../../core/services/toast.service";
import { IconComponent } from "../../shared/ui/icon.component";
import { ModalComponent } from "../../shared/ui/modal.component";
import { ConfirmDialogComponent } from "../../shared/dialogs/confirm-dialog.component";

@Component({
  selector: "app-categories",
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent, ModalComponent, ConfirmDialogComponent],
  template: `
    <div class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold tracking-tight">Categories</h2>
          <p class="text-sm text-muted-foreground">Organise products by category.</p>
        </div>
        <button class="btn-primary" (click)="openCreate()">
          <app-icon name="plus" [size]="18" /> Add category
        </button>
      </div>

      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th class="px-4 py-3 font-semibold">Name</th>
                <th class="px-4 py-3 font-semibold">Description</th>
                <th class="px-4 py-3 font-semibold">Status</th>
                <th class="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                @for (i of [1,2,3]; track i) {
                  <tr class="border-b border-border">
                    <td class="px-4 py-4" colspan="4">
                      <div class="h-5 w-full animate-pulse rounded bg-muted"></div>
                    </td>
                  </tr>
                }
              } @else if (categories().length === 0) {
                <tr>
                  <td colspan="4" class="px-4 py-16 text-center text-muted-foreground">
                    <p class="font-medium">No categories yet</p>
                  </td>
                </tr>
              } @else {
                @for (c of categories(); track c.id) {
                  <tr class="border-b border-border transition-colors hover:bg-muted/40">
                    <td class="px-4 py-3 font-medium">{{ c.name }}</td>
                    <td class="px-4 py-3 text-muted-foreground">{{ c.description || '—' }}</td>
                    <td class="px-4 py-3">
                      <span class="badge" [style.background]="c.isActive ? 'rgba(5,150,105,0.1)' : 'rgba(100,116,139,0.1)'"
                        [style.color]="c.isActive ? 'var(--success)' : 'var(--muted-foreground)'">
                        {{ c.isActive ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-right">
                      <button class="btn-ghost px-2 py-1.5" (click)="openEdit(c)" title="Edit">
                        <app-icon name="edit" [size]="17" />
                      </button>
                      @if (c.isActive) {
                        <button class="btn-ghost px-2 py-1.5" style="color: var(--danger)" (click)="askDelete(c)" title="Deactivate">
                          <app-icon name="trash" [size]="17" />
                        </button>
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    @if (showForm()) {
      <app-modal [title]="editing() ? 'Edit category' : 'New category'" (close)="showForm.set(false)">
        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
          <div>
            <label class="label" for="catName">Name</label>
            <input id="catName" class="input" formControlName="name" placeholder="Electronics" />
          </div>
          <div>
            <label class="label" for="catDesc">Description</label>
            <textarea id="catDesc" rows="2" class="input resize-none" formControlName="description" placeholder="Optional description"></textarea>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" class="btn-outline" (click)="showForm.set(false)">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="saving()">
              @if (saving()) {
                <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
              }
              {{ editing() ? 'Save' : 'Create' }}
            </button>
          </div>
        </form>
      </app-modal>
    }

    @if (deleting()) {
      <app-confirm
        title="Deactivate category"
        [message]="'Deactivate ' + deleting()!.name + '? Existing products will keep this category.'"
        confirmLabel="Deactivate"
        [danger]="true"
        [busy]="deleteBusy()"
        (confirm)="confirmDelete()"
        (cancel)="deleting.set(null)"
      />
    }
  `,
})
export class CategoriesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private categorySvc = inject(CategoryService);
  private toast = inject(ToastService);

  categories = signal<Category[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editing = signal<Category | null>(null);
  deleting = signal<Category | null>(null);
  deleteBusy = signal(false);
  saving = signal(false);

  form = this.fb.group({
    name: ["", [Validators.required, Validators.minLength(2)]],
    description: [""],
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.categorySvc.list({ limit: 100 }).subscribe({
      next: (res) => {
        this.categories.set(res.items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error("Failed to load categories.");
      },
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({ name: "", description: "" });
    this.showForm.set(true);
  }

  openEdit(c: Category): void {
    this.editing.set(c);
    this.form.patchValue({ name: c.name, description: c.description ?? "" });
    this.showForm.set(true);
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const dto: CreateCategoryDto = { name: raw.name!, description: raw.description || undefined };
    const req = this.editing()
      ? this.categorySvc.update(this.editing()!.id, dto)
      : this.categorySvc.create(dto);

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.toast.success(this.editing() ? "Category updated." : "Category created.");
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.toast.error("Could not save category.");
      },
    });
  }

  askDelete(c: Category): void {
    this.deleting.set(c);
  }

  confirmDelete(): void {
    const c = this.deleting();
    if (!c) return;
    this.deleteBusy.set(true);
    this.categorySvc.deactivate(c.id).subscribe({
      next: () => {
        this.deleteBusy.set(false);
        this.deleting.set(null);
        this.toast.success("Category deactivated.");
        this.load();
      },
      error: () => {
        this.deleteBusy.set(false);
        this.toast.error("Could not deactivate category.");
      },
    });
  }
}
