/**
 * Sign in — URL: /sign-in?next=/account
 *
 * The frame is prerendered. The part that reads the request (the `next` param and
 * whether someone is already signed in) streams in behind <Suspense>.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DEFAULT_SIGNED_IN_PATH, safeRedirectPath } from "@/lib/redirect";
import { firstParam } from "@/lib/search-params";
import { getCurrentUser } from "@/lib/session";

import { AuthPage } from "../_components/auth-page";
import { SignInForm } from "../_components/sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const next = searchParams.then(({ next }) => safeRedirectPath(firstParam(next)));

  return (
    <AuthPage
      eyebrow="Your account"
      title="Sign in"
      intro="Welcome back. Sign in to see your account."
    >
      <Suspense fallback={<SignInForm next={DEFAULT_SIGNED_IN_PATH} />}>
        <SignInSection next={next} />
      </Suspense>
    </AuthPage>
  );
}

async function SignInSection({ next: nextPromise }: { next: Promise<string> }) {
  const next = await nextPromise;
  if (await getCurrentUser()) redirect(next);

  const signUpHref =
    next === DEFAULT_SIGNED_IN_PATH ? "/sign-up" : `/sign-up?next=${encodeURIComponent(next)}`;

  return (
    <>
      <SignInForm next={next} />
      <p className="text-center text-body-sm text-muted">
        New to Atelier?{" "}
        <Link href={signUpHref} className="link text-ink">
          Create an account
        </Link>
      </p>
    </>
  );
}
