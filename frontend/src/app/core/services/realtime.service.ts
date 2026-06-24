import { Injectable, signal } from "@angular/core";
import { io, Socket } from "socket.io-client";
import { Subject } from "rxjs";
import { environment } from "../../../environments/environment";

export interface StockUpdate {
  productId: number;
  stock: number;
}

export interface TransactionEvent {
  saleId: number;
  total: number;
}

@Injectable({ providedIn: "root" })
export class RealtimeService {
  private socket?: Socket;

  readonly connected = signal(false);

  /** Emits whenever the backend broadcasts a stock change. */
  readonly stockUpdated$ = new Subject<StockUpdate>();
  /** Emits whenever a new sale is processed anywhere. */
  readonly transactionCreated$ = new Subject<TransactionEvent>();

  connect(): void {
    if (this.socket?.connected) return;

    const token = localStorage.getItem("rms_access_token") ?? undefined;

    this.socket = io(environment.socketUrl, {
      transports: ["websocket"],
      auth: token ? { token } : undefined,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });

    this.socket.on("connect", () => this.connected.set(true));
    this.socket.on("disconnect", () => this.connected.set(false));
    this.socket.on("connect_error", () => this.connected.set(false));

    // Support a few common event names so it works with the gateway as-is.
    const stockEvents = ["stockUpdated", "stock:updated", "stock_update"];
    for (const ev of stockEvents) {
      this.socket.on(ev, (payload: StockUpdate) => {
        if (payload && typeof payload.productId === "number") {
          this.stockUpdated$.next(payload);
        }
      });
    }

    const saleEvents = ["transactionCreated", "sale:created", "saleCreated"];
    for (const ev of saleEvents) {
      this.socket.on(ev, (payload: TransactionEvent) =>
        this.transactionCreated$.next(payload),
      );
    }
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = undefined;
    this.connected.set(false);
  }
}
