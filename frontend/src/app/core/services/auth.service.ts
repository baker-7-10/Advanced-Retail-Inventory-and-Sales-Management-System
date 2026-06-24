import { HttpClient } from "@angular/common/http";
import { Injectable, computed, inject, signal } from "@angular/core";
import { Observable, tap } from "rxjs";
import { environment } from "../../../environments/environment";
import { ApiResponse, AuthPayload, LoginDto, User } from "../models";

const ACCESS_KEY = "rms_access_token";
const REFRESH_KEY = "rms_refresh_token";
const USER_KEY = "rms_user";

/**
 * Some backend endpoints wrap the payload in { success, data } while the
 * 201 variant returns the payload directly. unwrap() handles both shapes.
 */
function unwrap<T>(res: ApiResponse<T> | T): T {
  if (res && typeof res === "object" && "data" in (res as object) && "success" in (res as object)) {
    return (res as ApiResponse<T>).data;
  }
  return res as T;
}

@Injectable({ providedIn: "root" })
export class AuthService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/auth`;

  readonly user = signal<User | null>(this.readUser());
  readonly isAuthenticated = computed(() => !!this.user() && !!this.accessToken);
  readonly role = computed(() => this.user()?.role ?? null);

  get accessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }
  get refreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  login(dto: LoginDto): Observable<AuthPayload> {
    return this.http
      .post<ApiResponse<AuthPayload> | AuthPayload>(`${this.base}/login`, dto)
      .pipe(
        tap((res) => this.persist(unwrap<AuthPayload>(res))),
        // map to plain payload for the caller
        tap(),
      ) as unknown as Observable<AuthPayload>;
  }

  refresh(): Observable<AuthPayload> {
    return this.http
      .post<ApiResponse<AuthPayload> | AuthPayload>(`${this.base}/refresh`, {
        refreshToken: this.refreshToken,
      })
      .pipe(tap((res) => this.persist(unwrap<AuthPayload>(res)))) as unknown as Observable<AuthPayload>;
  }

  loadProfile(): Observable<User> {
    return this.http
      .get<ApiResponse<User> | User>(`${this.base}/profile`)
      .pipe(tap((res) => this.user.set(unwrap<User>(res)))) as unknown as Observable<User>;
  }

  logout(): void {
    // fire-and-forget; backend invalidates refresh token
    this.http.post(`${this.base}/logout`, {}).subscribe({
      next: () => {},
      error: () => {},
    });
    this.clear();
  }

  private persist(payload: AuthPayload): void {
    localStorage.setItem(ACCESS_KEY, payload.accessToken);
    localStorage.setItem(REFRESH_KEY, payload.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
    this.user.set(payload.user);
  }

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  }

  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this.user.set(null);
  }

  private readUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}
