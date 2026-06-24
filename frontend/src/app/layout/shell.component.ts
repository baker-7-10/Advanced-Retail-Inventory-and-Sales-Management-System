import { Component, OnDestroy, OnInit, computed, inject, signal } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { AuthService } from "../core/services/auth.service";
import { CartService } from "../core/services/cart.service";
import { RealtimeService } from "../core/services/realtime.service";
import { IconComponent, IconName } from "../shared/ui/icon.component";

interface NavItem {
  label: string;
  path: string;
  icon: IconName;
  roles?: string[];
}

@Component({
  selector: "app-shell",
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <div class="flex min-h-screen bg-background">
      <!-- Sidebar -->
      <aside
        class="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform lg:translate-x-0 no-print"
        [class.-translate-x-full]="!sidebarOpen()"
      >
        <div class="flex h-16 items-center gap-2.5 border-b border-border px-5">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <app-icon name="store" [size]="20" />
          </div>
          <span class="text-lg font-bold tracking-tight">RetailOS</span>
        </div>

        <nav class="flex-1 space-y-1 overflow-y-auto p-3">
          @for (item of visibleNav(); track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="bg-primary text-primary-foreground"
              [routerLinkActiveOptions]="{ exact: false }"
              (click)="sidebarOpen.set(false)"
              class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <app-icon [name]="item.icon" [size]="19" />
              <span>{{ item.label }}</span>
              @if (item.path === '/pos' && cart.count() > 0) {
                <span class="ml-auto rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">
                  {{ cart.count() }}
                </span>
              }
            </a>
          }
        </nav>

        <div class="border-t border-border p-3">
          <div class="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
            <span
              class="h-2 w-2 rounded-full"
              [style.background]="rt.connected() ? 'var(--success)' : '#94a3b8'"
            ></span>
            {{ rt.connected() ? "Live sync active" : "Offline" }}
          </div>
        </div>
      </aside>

      @if (sidebarOpen()) {
        <div class="fixed inset-0 z-30 bg-black/30 lg:hidden no-print" (click)="sidebarOpen.set(false)"></div>
      }

      <!-- Main -->
      <div class="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header class="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur sm:px-6 no-print">
          <button class="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden" (click)="sidebarOpen.set(true)" aria-label="Open menu">
            <app-icon name="menu" [size]="22" />
          </button>
          <h1 class="text-base font-semibold text-foreground">{{ greeting() }}</h1>

          <div class="ml-auto flex items-center gap-3">
            <div class="hidden text-right sm:block">
              <p class="text-sm font-semibold leading-tight">{{ auth.user()?.name }}</p>
              <p class="text-xs capitalize text-muted-foreground">{{ auth.user()?.role }}</p>
            </div>
            <div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {{ initials() }}
            </div>
            <button class="btn-ghost px-2" (click)="logout()" title="Log out" aria-label="Log out">
              <app-icon name="logout" [size]="20" />
            </button>
          </div>
        </header>

        <main class="flex-1 p-4 sm:p-6">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class ShellComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  cart = inject(CartService);
  rt = inject(RealtimeService);

  sidebarOpen = signal(false);

  private nav: NavItem[] = [
    { label: "Dashboard", path: "/dashboard", icon: "dashboard" },
    { label: "Products", path: "/products", icon: "box" },
    { label: "Point of Sale", path: "/pos", icon: "cart" },
    { label: "Sales", path: "/sales", icon: "receipt" },
    { label: "Reports", path: "/reports", icon: "chart" },
    { label: "Categories", path: "/categories", icon: "tag" },
    { label: "Users", path: "/users", icon: "users", roles: ["admin", "manager"] },
  ];

  visibleNav = computed(() => {
    const role = this.auth.role();
    return this.nav.filter((n) => !n.roles || (role && n.roles.includes(role)));
  });

  initials = computed(() => {
    const name = this.auth.user()?.name ?? "U";
    return name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  });

  greeting = computed(() => {
    const h = new Date().getHours();
    const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    const first = this.auth.user()?.name?.split(" ")[0] ?? "";
    return `${part}${first ? ", " + first : ""}`;
  });

  ngOnInit(): void {
    this.rt.connect();
  }

  ngOnDestroy(): void {
    this.rt.disconnect();
  }

  logout(): void {
    this.auth.logout();
    window.location.href = "/login";
  }
}
