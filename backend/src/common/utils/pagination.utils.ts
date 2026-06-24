export function isPaginatedResponse(
  value: unknown,
): value is { items: unknown[]; meta: Record<string, unknown> } {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  const hasArray = (key: string) => Array.isArray(obj[key]);
  const hasMeta = typeof obj.meta === 'object' && obj.meta !== null;

  if (!hasMeta) return false;

  return hasArray('data') || hasArray('items') || hasArray('results');
}
