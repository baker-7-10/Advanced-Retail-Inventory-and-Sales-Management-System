import { DatePipe } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { CreateUserDto, User, UserRole } from "../../core/models";
import { UserService } from "../../core/services/user.service";
import { AuthService } from "../../core/services/auth.service";
import { ToastService } from "../../core/services/toast.service";
import { IconComponent } from "../../shared/ui/icon.component";
import { ModalComponent } from "../../shared/ui/modal.component";
import { ConfirmDialogComponent } from "../../shared/dialogs/confirm-dialog.component";

@Component({
  selector: "app-users",
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, IconComponent, ModalComponent],
  template: `
    <div class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold tracking-tight">Users</h2>
          <p class="text-sm text-muted-foreground">Manage staff accounts and roles.</p>
        </div>
        <button class="btn-primary" (click)="openCreate()">
          <app-icon name="plus" [size]="18" /> Add user
        </button>
      </div>

      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th class="px-4 py-3 font-semibold">Name</th>
                <th class="px-4 py-3 font-semibold">Email</th>
                <th class="px-4 py-3 font-semibold">Role</th>
                <th class="px-4 py-3 font-semibold">Status</th>
                <th class="px-4 py-3 font-semibold">Created</th>
                <th class="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                @for (i of [1,2,3]; track i) {
                  <tr class="border-b border-border">
                    <td class="px-4 py-4" colspan="6">
                      <div class="h-5 w-full animate-pulse rounded bg-muted"></div>
                    </td>
                  </tr>
                }
              } @else if (users().length === 0) {
                <tr>
                  <td colspan="6" class="px-4 py-16 text-center text-muted-foreground">
                    <p class="font-medium">No users found</p>
                  </td>
                </tr>
              } @else {
                @for (u of users(); track u.id) {
                  <tr class="border-b border-border transition-colors hover:bg-muted/40">
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-3">
                        <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {{ initials(u.name) }}
                        </div>
                        <span class="font-medium">{{ u.name }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-muted-foreground">{{ u.email }}</td>
                    <td class="px-4 py-3">
                      <span class="badge capitalize" [style.background]="roleBg(u.role)" [style.color]="roleColor(u.role)">
                        {{ u.role }}
                      </span>
                    </td>
                    <td class="px-4 py-3">
                      <span class="badge" [style.background]="u.isActive ? 'rgba(5,150,105,0.1)' : 'rgba(100,116,139,0.1)'"
                        [style.color]="u.isActive ? 'var(--success)' : 'var(--muted-foreground)'">
                        {{ u.isActive ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-muted-foreground">{{ u.createdAt | date: 'MMM d, y' }}</td>
                    <td class="px-4 py-3 text-right">
                      <button class="btn-ghost px-2 py-1.5" (click)="toggleActive(u)" [title]="u.isActive ? 'Deactivate' : 'Activate'">
                        <app-icon [name]="u.isActive ? 'close' : 'check'" [size]="17" />
                      </button>
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
      <app-modal title="New user" (close)="showForm.set(false)">
        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
          <div>
            <label class="label" for="userName">Name</label>
            <input id="userName" class="input" formControlName="name" placeholder="John Doe" />
          </div>
          <div>
            <label class="label" for="userEmail">Email</label>
            <input id="userEmail" type="email" class="input" formControlName="email" placeholder="john@store.com" />
          </div>
          <div>
            <label class="label" for="userPassword">Password</label>
            <input id="userPassword" type="password" class="input" formControlName="password" placeholder="Minimum 8 characters" />
          </div>
          <div>
            <label class="label" for="userRole">Role</label>
            <select id="userRole" class="input" formControlName="role">
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" class="btn-outline" (click)="showForm.set(false)">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="saving()">
              @if (saving()) {
                <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
              }
              Create user
            </button>
          </div>
        </form>
      </app-modal>
    }
  `,
})
export class UsersComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userSvc = inject(UserService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  users = signal<User[]>([]);
  loading = signal(true);
  showForm = signal(false);
  saving = signal(false);

  form = this.fb.group({
    name: ["", [Validators.required]],
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(8)]],
    role: ["employee" as UserRole],
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.userSvc.list({ limit: 100 }).subscribe({
      next: (res) => {
        this.users.set(res.items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error("Failed to load users.");
      },
    });
  }

  openCreate(): void {
    this.form.reset({ name: "", email: "", password: "", role: "employee" });
    this.showForm.set(true);
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const dto: CreateUserDto = {
      name: raw.name!,
      email: raw.email!,
      password: raw.password!,
      role: raw.role as UserRole,
    };
    this.userSvc.create(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.toast.success("User created.");
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.toast.error("Could not create user.");
      },
    });
  }

  toggleActive(u: User): void {
    this.userSvc.toggleActive(u.id).subscribe({
      next: () => {
        this.toast.success(u.isActive ? "User deactivated." : "User activated.");
        this.load();
      },
      error: () => {
        this.toast.error("Could not toggle user status.");
      },
    });
  }

  initials(name: string): string {
    return name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  roleColor(role: string): string {
    switch (role) {
      case "admin": return "var(--danger)";
      case "manager": return "var(--warning)";
      default: return "var(--primary)";
    }
  }

  roleBg(role: string): string {
    switch (role) {
      case "admin": return "rgba(220,38,38,0.1)";
      case "manager": return "rgba(217,119,6,0.12)";
      default: return "rgba(29,78,216,0.1)";
    }
  }
}
