import { CurrencyPipe } from "@angular/common";
import { Component, Input, computed, signal } from "@angular/core";

export interface ChartPoint {
  label: string;
  value: number;
}

@Component({
  selector: "app-bar-chart",
  standalone: true,
  imports: [CurrencyPipe],
  template: `
    <div class="flex h-full items-end gap-2">
      @for (p of points(); track p.label; let i = $index) {
        <div class="group flex flex-1 flex-col items-center gap-2">
          <div class="relative flex w-full flex-1 items-end">
            <div
              class="w-full rounded-t-md bg-primary/85 transition-all duration-500 hover:bg-primary"
              [style.height.%]="heightPct(p.value)"
              [title]="p.label + ': ' + (p.value | currency)"
            ></div>
          </div>
          <span class="truncate text-[11px] text-muted-foreground">{{ p.label }}</span>
        </div>
      }
    </div>
  `,
})
export class BarChartComponent {
  points = signal<ChartPoint[]>([]);
  @Input({ required: true }) set data(value: ChartPoint[]) {
    this.points.set(value ?? []);
  }

  private max = computed(() => Math.max(1, ...this.points().map((p) => p.value)));

  heightPct(value: number): number {
    return Math.max(4, (value / this.max()) * 100);
  }
}
