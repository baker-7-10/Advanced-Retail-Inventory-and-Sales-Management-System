import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { HttpErrorResponse } from "@angular/common/http";
import { AuthService } from "../../core/services/auth.service";
import { IconComponent } from "../../shared/icon.component";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  template: `
    <div class="flex min-h-screen">
      <!-- Brand panel -->
      <div class="relative hidden w-1/2 flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <div class="flex items-center gap-3">
          <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
            <app-icon name="store" [size]="26" />
          </div>
          <span class="text-xl font-bold tracking-tight">RetailOS</span>
        </div>
        <div class="max-w-md">
          <h1 class="text-balance text-4xl font-bold leading-tight">
            Advanced Retail Inventory & Sales Management
          </h1>
          <p class="mt-4 text-pretty text-base leading-relaxed text-white/80">
            Real-time stock tracking, lightning-fast point of sale, and analytics that help your store run smarter.
          </p>
          <div class="mt-8 grid grid-cols-3 gap-4">
            @for (s of stats; track s.label) {
              <div>
                <p class="text-2xl font-bold">{{ s.value }}</p>
                <p class="text-xs text-white/70">{{ s.label }}</p>
              </div>
            }
          </div>
        </div>
        <p class="text-xs text-white/60">© {{ year }} RetailOS. All rights reserved.</p>
      </div>

      <!-- Form panel -->
      <div class="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div class="w-full max-w-sm">
          <div class="mb-8 flex items-center gap-2 lg:hidden">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <app-icon name="store" [size]="22" />
            </div>
            <span class="text-lg font-bold">RetailOS</span>
          </div>

          <h2 class="text-2xl font-bold text-foreground">Welcome back</h2>
          <p class="mt-1 text-sm text-muted-foreground">Sign in to your account to continue</p>

          <form [formGroup]="form" (ngSubmit)="submit()" class="mt-8 space-y-4">
            <div>
              <label class="label" for="email">Email address</label>
              <input
                id="email"
                type="email"
                class="input"
                formControlName="email"
                placeholder="admin@store.com"
                autocomplete="email"
              />
              @if (showError('email')) {
                <p class="mt-1 text-xs" style="color: var(--danger)">Enter a valid email.</p>
              }
            </div>

            <div>
              <label class="label" for="password">Password</label>
              <div class="relative">
                <input
                  id="password"
                  [type]="showPwd() ? 'text' : 'password'"
                  class="input pr-12"
                  formControlName="password"
                  placeholder="••••••••"
                  autocomplete="current-password"
                />
                <button
                  type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                  (click)="showPwd.set(!showPwd())"
                >
                  {{ showPwd() ? "Hide" : "Show" }}
                </button>
              </div>
              @if (showError('password')) {
                <p class="mt-1 text-xs" style="color: var(--danger)">Password must be at least 6 characters.</p>
              }
            </div>

            @if (errorMsg()) {
              <div class="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm" style="color: var(--danger)">
                <app-icon name="alert" [size]="16" />
                <span>{{ errorMsg() }}</span>
              </div>
            }

            <button type="submit" class="btn-primary w-full" [disabled]="loading()">
              @if (loading()) {
                <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                <span>Signing in…</span>
              } @else {
                <span>Sign in</span>
              }
            </button>
          </form>

          <p class="mt-6 text-center text-xs text-muted-foreground">
            Connects to your NestJS API at <code class="font-mono">/api/v1/auth/login</code>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  year = new Date().getFullYear();
  stats = [
    { value: "10k+", label: "Products" },
    { value: "99.9%", label: "Uptime" },
    { value: "Real-time", label: "Stock sync" },
  ];

  loading = signal(false);
  showPwd = signal(false);
  errorMsg = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(6)]],
  });

  showError(control: "email" | "password"): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.touched || c.dirty);
  }

  submit(): void {
    this.errorMsg.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(["/dashboard"]);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMsg.set(this.mapError(err));
      },
    });
  }

  private mapError(err: HttpErrorResponse): string {
    if (err.status === 0) return "Cannot reach the API. Is the backend running on localhost:3000?";
    if (err.status === 401) return "Invalid email or password.";
    if (err.status === 403) return "Account temporarily locked. Try again later.";
    if (err.status === 429) return "Too many attempts. Please wait and try again.";
    const msg = (err.error as { message?: string | string[] })?.message;
    if (Array.isArray(msg)) return msg.join(", ");
    return msg ?? "Login failed. Please try again.";
  }
}
