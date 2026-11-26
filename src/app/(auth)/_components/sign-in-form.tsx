"use client";

import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import { AuthField, FormError, FormFields, useAuthForm } from "./auth-form";
import {
  INVALID_EMAIL,
  isInvalidEmailError,
  TOO_MANY_ATTEMPTS,
  validateCurrentPassword,
  validateEmail,
} from "./validation";

// Posts to /api/auth through the auth client (not a Server Action) so Better Auth's
// rate limiter and origin check apply. On success the response sets the session
// cookie and we navigate to the already-validated `next` path.
export function SignInForm({ next }: { next: string }) {
  const router = useRouter();

  const { formRef, onSubmit, pending, formError, field } = useAuthForm({
    validators: { email: validateEmail, password: validateCurrentPassword },
    async submit({ email, password }) {
      const { error } = await authClient.signIn.email({
        email: email.trim(),
        password,
        rememberMe: true, // persistent cookie (30 days)
      });

      if (!error) {
        router.replace(next);
        router.refresh();
        return { ok: true };
      }
      if (error.status === 429) return { ok: false, formError: TOO_MANY_ATTEMPTS };
      if (isInvalidEmailError(error)) return { ok: false, fieldErrors: { email: INVALID_EMAIL } };
      if (error.status === 401) {
        // One message for both cases so the form doesn't reveal which emails have accounts.
        return { ok: false, formError: "Email or password is incorrect. Please try again." };
      }
      return { ok: false, formError: "We couldn’t sign you in. Please try again." };
    },
  });

  return (
    // noValidate: our messages replace the browser's. method="post" keeps credentials
    // out of the URL if the form is submitted before JavaScript loads.
    <form
      ref={formRef}
      method="post"
      noValidate
      onSubmit={onSubmit}
      aria-busy={pending}
      className="flex flex-col gap-5"
    >
      {formError && <FormError>{formError}</FormError>}
      <FormFields pending={pending}>
        <AuthField
          {...field("email")}
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          required
        />
        <AuthField
          {...field("password")}
          label="Password"
          type="password"
          autoComplete="current-password"
          maxLength={128}
          required
          revealable
        />
        <button type="submit" className="btn btn-primary btn-block mt-2">
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </FormFields>
    </form>
  );
}
