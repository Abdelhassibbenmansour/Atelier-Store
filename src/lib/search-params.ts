// Helpers for reading URL search params. Safe to import anywhere.

/** Next.js gives `string | string[] | undefined`; use the first value, or "". */
export function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}
