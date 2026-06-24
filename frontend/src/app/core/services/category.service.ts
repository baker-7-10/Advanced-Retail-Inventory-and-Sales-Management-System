import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, map } from "rxjs";
import { environment } from "../../../environments/environment";
import { Category, CreateCategoryDto, Paginated, UpdateCategoryDto } from "../models";
import { normalizePaginated, toParams, unwrap } from "./api.util";

@Injectable({ providedIn: "root" })
export class CategoryService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/categories`;

  list(query: { page?: number; limit?: number; search?: string } = {}): Observable<Paginated<Category>> {
    return this.http
      .get(this.base, { params: toParams({ limit: 100, ...query }) })
      .pipe(map((res) => normalizePaginated<Category>(res)));
  }

  get(id: number): Observable<Category> {
    return this.http.get(`${this.base}/${id}`).pipe(map((r) => unwrap<Category>(r as never)));
  }

  create(dto: CreateCategoryDto): Observable<Category> {
    return this.http.post(this.base, dto).pipe(map((r) => unwrap<Category>(r as never)));
  }

  update(id: number, dto: UpdateCategoryDto): Observable<Category> {
    return this.http.patch(`${this.base}/${id}`, dto).pipe(map((r) => unwrap<Category>(r as never)));
  }

  deactivate(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/${id}`);
  }
}
