import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, map } from "rxjs";
import { environment } from "../../../environments/environment";
import {
  CreateProductDto,
  Paginated,
  Product,
  ProductQuery,
  UpdateProductDto,
} from "../models";
import { normalizePaginated, toParams, unwrap } from "./api.util";

@Injectable({ providedIn: "root" })
export class ProductService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/products`;

  list(query: ProductQuery = {}): Observable<Paginated<Product>> {
    return this.http
      .get(this.base, { params: toParams(query as Record<string, unknown>) })
      .pipe(map((res) => normalizePaginated<Product>(res)));
  }

  lowStock(): Observable<Product[]> {
    return this.http
      .get(`${this.base}/low-stock`)
      .pipe(map((res) => normalizePaginated<Product>(res).items));
  }

  get(id: number): Observable<Product> {
    return this.http.get(`${this.base}/${id}`).pipe(map((r) => unwrap<Product>(r as never)));
  }

  create(dto: CreateProductDto): Observable<Product> {
    return this.http.post(this.base, dto).pipe(map((r) => unwrap<Product>(r as never)));
  }

  update(id: number, dto: UpdateProductDto): Observable<Product> {
    return this.http.patch(`${this.base}/${id}`, dto).pipe(map((r) => unwrap<Product>(r as never)));
  }

  deactivate(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/${id}`);
  }
}
