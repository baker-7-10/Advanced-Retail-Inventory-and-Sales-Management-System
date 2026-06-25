import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from "rxjs";
import { environment } from "../../../environments/environment";
import { AuthService } from "../services/auth.service";
import { ToastService } from "../services/toast.service";

// Shared refresh state across concurrent 401s
let isRefreshing = false;
const REFRESH_FAILED = Symbol("refresh_failed");
const refreshDone$ = new BehaviorSubject<string | typeof REFRESH_FAILED | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  const isAuthCall =
    req.url.includes("/auth/login") || req.url.includes("/auth/refresh");

  const withToken = (token: string | null) =>
    token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  const onAuthFail = () => {
    auth.clear();
    router.navigate(["/login"]);
  };

  return next(withToken(auth.accessToken)).pipe(
    catchError((err: HttpErrorResponse) => {
      const canRefresh =
        err.status === 401 &&
        !isAuthCall &&
        !!auth.refreshToken &&
        req.url.startsWith(environment.apiUrl);

      if (!canRefresh) {
        if (err.status === 401 && !isAuthCall) {
          onAuthFail();
        } else if (err.status === 403) {
          toast.error("You do not have the required permissions.");
        }
        return throwError(() => err);
      }

      if (isRefreshing) {
        return refreshDone$.pipe(
          filter((t) => t !== null),
          take(1),
          switchMap((token) => {
            if (token === REFRESH_FAILED) {
              onAuthFail();
              return throwError(() => new Error("Token refresh failed"));
            }
            return next(withToken(token as string));
          }),
        );
      }

      isRefreshing = true;
      refreshDone$.next(null);

      return auth.refresh().pipe(
        switchMap((payload) => {
          isRefreshing = false;
          refreshDone$.next(payload.accessToken);
          return next(withToken(payload.accessToken));
        }),
        catchError((refreshErr) => {
          isRefreshing = false;
          refreshDone$.next(REFRESH_FAILED);
          onAuthFail();
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};
