import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from "rxjs";
import { environment } from "../../../environments/environment";
import { AuthService } from "../services/auth.service";

// Shared refresh state across concurrent 401s
let isRefreshing = false;
const refreshDone$ = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isAuthCall =
    req.url.includes("/auth/login") || req.url.includes("/auth/refresh");

  const withToken = (token: string | null) =>
    token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(withToken(auth.accessToken)).pipe(
    catchError((err: HttpErrorResponse) => {
      const canRefresh =
        err.status === 401 &&
        !isAuthCall &&
        !!auth.refreshToken &&
        req.url.startsWith(environment.apiUrl);

      if (!canRefresh) {
        if (err.status === 401 && !isAuthCall) {
          auth.clear();
          router.navigate(["/login"]);
        }
        return throwError(() => err);
      }

      if (isRefreshing) {
        // queue until the in-flight refresh resolves
        return refreshDone$.pipe(
          filter((t): t is string => t !== null),
          take(1),
          switchMap((token) => next(withToken(token))),
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
          auth.clear();
          router.navigate(["/login"]);
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};
