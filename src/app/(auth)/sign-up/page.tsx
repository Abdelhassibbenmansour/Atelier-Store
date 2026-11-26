/**
 * Create an account — URL: /sign-up?next=/account
 *
 * Same structure as /sign-in: prerendered frame, request-dependent part in <Suspense>.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DEFAULT_SIGNED_IN_PATH, safeRedirectPath } from "@/lib/redirect";
import { firstParam } from "@/lib/search-params";
import { getCurrentUser } from "@/lib/session";

import { AuthPage } from "../_components/auth-page";
import { SignUpForm } from "../_components/sign-up-form";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
};

export default function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const next = searchParams.then(({ next }) => safeRedirectPath(firstParam(next)));

  return (
    <AuthPage
      eyebrow="Your account"
      title="Create an account"
      intro="Join Atelier to keep your details in one place."
    >
      <Suspense fallback={<SignUpForm next={DEFAULT_SIGNED_IN_PATH} signInHref="/sign-in" />}>
        <SignUpSection next={next} />
      </Suspense>
    </AuthPage>
  );
}

async function SignUpSection({ next: nextPromise }: { next: Promise<string> }) {
  const next = await nextPromise;
  if (await getCurrentUser()) redirect(next);

  const signInHref =
    next === DEFAULT_SIGNED_IN_PATH ? "/sign-in" : `/sign-in?next=${encodeURIComponent(next)}`;

  return (
    <>
      <SignUpForm next={next} signInHref={signInHref} />
      <p className="text-center text-body-sm text-muted">
        Already have an account?{" "}
        <Link href={signInHref} className="link text-ink">
          Sign in
        </Link>
      </p>
    </>
  );
}
