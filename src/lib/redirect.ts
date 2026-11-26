// Safe post-sign-in redirects. Safe to import from client components.

export const DEFAULT_SIGNED_IN_PATH = "/account";

const ORIGIN = "http://atelier.invalid";

/**
 * Returns `next` only if it is a same-site path ("/account", "/admin?x=1"),
 * otherwise the fallback. Blocks open redirects such as "//evil.com", "/\evil.com"
 * and paths hiding control characters that browsers strip ("/\t/evil.com").
 */
export function safeRedirectPath(next: unknown, fallback = DEFAULT_SIGNED_IN_PATH): string {
  if (typeof next !== "string" || !next.startsWith("/")) return fallback;
  if (/[\u0000-\u001F\u007F\\]/.test(next)) return fallback;

  try {
    const url = new URL(next, ORIGIN);
    if (url.origin !== ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

/** Sign-in URL that returns to `path` afterwards. */
export function signInPath(path: string) {
  return `/sign-in?next=${encodeURIComponent(path)}`;
}
