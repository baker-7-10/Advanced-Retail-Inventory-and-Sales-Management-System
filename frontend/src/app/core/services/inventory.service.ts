import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, map } from "rxjs";
import { environment } from "../../../environments/environment";
import { InventoryStats, Product } from "../models";
import { normalizePaginated, unwrap } from "./api.util";

@Injectable({ providedIn: "root" })
export class InventoryService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/inventory`;

  lowStock(): Observable<Product[]> {
    return this.http
      .get(`${this.base}/low-stock`)
      .pipe(map((res) => normalizePaginated<Product>(res).items));
  }

  stats(): Observable<InventoryStats> {
    return this.http
      .get(`${this.base}/stats`)
      .pipe(map((r) => unwrap<InventoryStats>(r as never)));
  }

  updateMinimumStock(productId: number, minimumStock: number): Observable<unknown> {
    return this.http.patch(`${this.base}/${productId}/minimum-stock`, { minimumStock });
  }
}
