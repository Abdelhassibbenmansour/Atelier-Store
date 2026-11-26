// Server-side session access. The only place pages, layouts and Server Actions read
// the current user. Reading the session reads request headers, so components that
// call these must sit inside <Suspense> (Cache Components).
//
// src/proxy.ts only checks that a session cookie exists; these functions are the real
// check. Every admin page, Server Action and route handler must call requireAdmin().
import "server-only";

import { headers } from "next/headers";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { auth, type Role } from "@/lib/auth";
import { signInPath } from "@/lib/redirect";

/** The narrow user shape handed to UI. Never pass the raw session to components. */
export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** When the account was created. */
  memberSince: Date;
};

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  // A Date from the database, or an ISO string when served from the cookie cache.
  createdAt: Date | string;
};

function toCurrentUser(user: SessionUser): CurrentUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role === "admin" ? "admin" : "customer",
    memberSince: new Date(user.createdAt),
  };
}

// `await connection()` first: prerenders (including the runtime prefetch prerender that
// partialPrefetching runs with request headers) stop here, so they never start a
// session query that gets aborted mid-flight. Real requests continue immediately.

/** Read once per request (React cache). May be served from the 5-minute cookie cache. */
const getSession = cache(async () => {
  await connection();
  return auth.api.getSession({ headers: await headers() });
});

/** Always checks the database, so role changes and revoked sessions apply immediately. */
const getFreshSession = cache(async () => {
  await connection();
  return auth.api.getSession({ headers: await headers(), query: { disableCookieCache: true } });
});

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  return session ? toCurrentUser(session.user) : null;
}

/** Signed-in user, or a redirect to sign-in that returns to `returnTo` afterwards. */
export async function requireUser(returnTo: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(signInPath(returnTo));
  return user;
}

/**
 * Signed-in admin. Signed-out visitors go to sign-in; signed-in non-admins get a 404
 * so the admin area is not revealed.
 */
export async function requireAdmin(returnTo = "/admin"): Promise<CurrentUser> {
  const session = await getFreshSession();
  if (!session) redirect(signInPath(returnTo));

  const user = toCurrentUser(session.user);
  if (user.role !== "admin") notFound();
  return user;
}

/** Thrown by requireAdminForAction when the caller isn't a signed-in admin. */
export class AdminAccessError extends Error {
  constructor() {
    super("Admin access required");
  }
}

/**
 * For Server Actions: same fresh (database) role check as requireAdmin, but throws
 * AdminAccessError instead of redirecting or rendering a 404, so the action can
 * return a normal error. Call it before reading input or writing anything.
 */
export async function requireAdminForAction(): Promise<CurrentUser> {
  const session = await getFreshSession();
  if (!session) throw new AdminAccessError();
  const user = toCurrentUser(session.user);
  if (user.role !== "admin") throw new AdminAccessError();
  return user;
}

/** For metadata and other non-throwing checks: is the caller a signed-in admin? */
export async function isAdmin(): Promise<boolean> {
  const session = await getFreshSession();
  return session ? toCurrentUser(session.user).role === "admin" : false;
}
