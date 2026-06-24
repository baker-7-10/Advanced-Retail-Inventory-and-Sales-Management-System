import { Component, EventEmitter, Input, Output } from "@angular/core";
import { ModalComponent } from "./modal.component";
import { IconComponent } from "./icon.component";

@Component({
  selector: "app-confirm",
  standalone: true,
  imports: [ModalComponent, IconComponent],
  template: `
    <app-modal [title]="title" widthClass="max-w-md" (close)="cancel.emit()">
      <div class="flex gap-4">
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          [style.background]="danger ? 'rgba(220,38,38,0.1)' : 'rgba(29,78,216,0.1)'"
          [style.color]="danger ? 'var(--danger)' : 'var(--primary)'"
        >
          <app-icon name="alert" [size]="22" />
        </div>
        <p class="text-sm leading-relaxed text-muted-foreground">{{ message }}</p>
      </div>
      <div class="mt-6 flex justify-end gap-2">
        <button class="btn-outline" (click)="cancel.emit()">{{ cancelLabel }}</button>
        <button [class]="danger ? 'btn-danger' : 'btn-primary'" (click)="confirm.emit()" [disabled]="busy">
          @if (busy) {
            <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
          }
          {{ confirmLabel }}
        </button>
      </div>
    </app-modal>
  `,
})
export class ConfirmDialogComponent {
  @Input() title = "Are you sure?";
  @Input() message = "";
  @Input() confirmLabel = "Confirm";
  @Input() cancelLabel = "Cancel";
  @Input() danger = false;
  @Input() busy = false;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
