import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, map } from "rxjs";
import { environment } from "../../../environments/environment";
import { CreateUserDto, Paginated, UpdateUserDto, User } from "../models";
import { normalizePaginated, toParams, unwrap } from "./api.util";

@Injectable({ providedIn: "root" })
export class UserService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/users`;

  list(query: { page?: number; limit?: number; search?: string } = {}): Observable<Paginated<User>> {
    return this.http
      .get(this.base, { params: toParams(query as Record<string, unknown>) })
      .pipe(map((res) => normalizePaginated<User>(res)));
  }

  create(dto: CreateUserDto): Observable<User> {
    return this.http.post(this.base, dto).pipe(map((r) => unwrap<User>(r as never)));
  }

  update(id: number, dto: UpdateUserDto): Observable<User> {
    return this.http.patch(`${this.base}/${id}`, dto).pipe(map((r) => unwrap<User>(r as never)));
  }

  toggleActive(id: number): Observable<User> {
    return this.http
      .patch(`${this.base}/${id}/toggle-active`, {})
      .pipe(map((r) => unwrap<User>(r as never)));
  }
}
