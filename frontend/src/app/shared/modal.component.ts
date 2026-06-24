import { Component, EventEmitter, Input, Output } from "@angular/core";
import { IconComponent } from "./icon.component";

@Component({
  selector: "app-modal",
  standalone: true,
  imports: [IconComponent],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:items-center no-print"
      (click)="onBackdrop($event)"
    >
      <div
        class="card my-8 w-full animate-in"
        [class]="widthClass"
        role="dialog"
        aria-modal="true"
        (click)="$event.stopPropagation()"
      >
        <div class="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 class="text-lg font-semibold text-foreground">{{ title }}</h2>
          <button class="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" (click)="close.emit()" aria-label="Close">
            <app-icon name="close" [size]="20" />
          </button>
        </div>
        <div class="px-5 py-5">
          <ng-content />
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .animate-in {
        animation: pop 0.16s ease-out;
      }
      @keyframes pop {
        from {
          opacity: 0;
          transform: translateY(8px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `,
  ],
})
export class ModalComponent {
  @Input() title = "";
  @Input() widthClass = "max-w-lg";
  @Input() closeOnBackdrop = true;
  @Output() close = new EventEmitter<void>();

  onBackdrop(_e: MouseEvent): void {
    if (this.closeOnBackdrop) this.close.emit();
  }
}
