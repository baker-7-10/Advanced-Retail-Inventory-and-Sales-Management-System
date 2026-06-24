import { HttpParams } from "@angular/common/http";
import { ApiResponse, Paginated, PaginationMeta } from "../models";

/** Unwrap the { success, message, data } envelope, tolerating raw payloads. */
export function unwrap<T>(res: ApiResponse<T> | T): T {
  if (
    res &&
    typeof res === "object" &&
    "data" in (res as object) &&
    "success" in (res as object)
  ) {
    return (res as ApiResponse<T>).data;
  }
  return res as T;
}

/**
 * Normalize a paginated payload. Backends differ between
 * { items, meta }, { data, meta }, or a bare array.
 */
export function normalizePaginated<T>(raw: unknown): Paginated<T> {
  const payload = unwrap<unknown>(raw as ApiResponse<unknown>);

  if (Array.isArray(payload)) {
    return {
      items: payload as T[],
      meta: defaultMeta(payload.length),
    };
  }

  const obj = (payload ?? {}) as Record<string, unknown>;
  const items = (obj["items"] ?? obj["data"] ?? obj["results"] ?? []) as T[];
  const meta = (obj["meta"] ?? obj["pagination"]) as PaginationMeta | undefined;

  return {
    items: Array.isArray(items) ? items : [],
    meta: meta ?? defaultMeta(Array.isArray(items) ? items.length : 0),
  };
}

function defaultMeta(total: number): PaginationMeta {
  return { total, page: 1, limit: total || 10, totalPages: 1 };
}

/** Build HttpParams from a sparse query object, skipping null/undefined/"". */
export function toParams(query: Record<string, unknown>): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue;
    params = params.set(key, String(value));
  }
  return params;
}
