import { Component, inject } from "@angular/core";
import { ToastService } from "../core/services/toast.service";

@Component({
  selector: "app-toasts",
  standalone: true,
  template: `
    <div class="fixed bottom-4 right-4 z-[100] flex w-80 max-w-[90vw] flex-col gap-2 no-print">
      @for (t of toast.toasts(); track t.id) {
        <div
          class="flex items-start gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg"
          [class.border-l-4]="true"
          [style.border-left-color]="color(t.kind)"
        >
          <span class="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full" [style.background]="color(t.kind)"></span>
          <p class="flex-1 text-sm text-foreground">{{ t.message }}</p>
          <button
            class="text-muted-foreground hover:text-foreground"
            (click)="toast.dismiss(t.id)"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  toast = inject(ToastService);

  color(kind: string): string {
    switch (kind) {
      case "success":
        return "var(--success)";
      case "error":
        return "var(--danger)";
      case "warning":
        return "var(--warning)";
      default:
        return "var(--primary)";
    }
  }
}
