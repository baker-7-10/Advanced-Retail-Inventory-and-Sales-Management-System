import { Injectable, signal } from "@angular/core";

export type ToastKind = "success" | "error" | "info" | "warning";

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

@Injectable({ providedIn: "root" })
export class ToastService {
  private seq = 0;
  readonly toasts = signal<Toast[]>([]);

  show(message: string, kind: ToastKind = "info", duration = 3500): void {
    const id = ++this.seq;
    this.toasts.update((t) => [...t, { id, kind, message }]);
    setTimeout(() => this.dismiss(id), duration);
  }

  success(message: string): void {
    this.show(message, "success");
  }
  error(message: string): void {
    this.show(message, "error", 5000);
  }
  info(message: string): void {
    this.show(message, "info");
  }
  warning(message: string): void {
    this.show(message, "warning");
  }

  dismiss(id: number): void {
    this.toasts.update((t) => t.filter((x) => x.id !== id));
  }
}
