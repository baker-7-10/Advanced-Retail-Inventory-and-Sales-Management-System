import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, map } from "rxjs";
import { environment } from "../../../environments/environment";
import { CreateSaleDto, Invoice, Paginated, Sale, SaleStatus } from "../models";
import { normalizePaginated, toParams, unwrap } from "./api.util";

@Injectable({ providedIn: "root" })
export class SaleService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/sales`;

  list(query: { page?: number; limit?: number; status?: string } = {}): Observable<Paginated<Sale>> {
    return this.http
      .get(this.base, { params: toParams(query as Record<string, unknown>) })
      .pipe(map((res) => normalizePaginated<Sale>(res)));
  }

  get(id: number): Observable<Sale> {
    return this.http.get(`${this.base}/${id}`).pipe(map((r) => unwrap<Sale>(r as never)));
  }

  checkout(dto: CreateSaleDto): Observable<Sale> {
    return this.http.post(this.base, dto).pipe(map((r) => unwrap<Sale>(r as never)));
  }

  updateStatus(id: number, status: SaleStatus): Observable<Sale> {
    return this.http
      .patch(`${this.base}/${id}/status`, { status })
      .pipe(map((r) => unwrap<Sale>(r as never)));
  }

  invoice(id: number): Observable<Invoice> {
    return this.http.get(`${this.base}/${id}/invoice`).pipe(map((r) => unwrap<Invoice>(r as never)));
  }
}
