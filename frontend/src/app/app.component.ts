import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { ToastContainerComponent } from "./shared/ui/toast-container.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent],
  template: `
    <router-outlet />
    <app-toasts />
  `,
})
export class AppComponent {}
