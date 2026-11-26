"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

/** Deletes the session row and clears the session cookies (via nextCookies). */
export async function signOut() {
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch (error) {
    // Already signed out (no or expired session): nothing to revoke.
    if (!(error instanceof APIError)) throw error;
  }
  redirect("/");
}
