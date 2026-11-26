"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import { AuthField, FormError, FormFields, useAuthForm } from "./auth-form";
import {
  INVALID_EMAIL,
  isInvalidEmailError,
  NAME_MAX,
  PASSWORD_MAX,
  PASSWORD_MIN,
  TOO_MANY_ATTEMPTS,
  validateEmail,
  validateName,
  validateNewPassword,
} from "./validation";

// Creates the account through /api/auth (rate-limited). autoSignIn is on, so the
// response also sets the session cookie. The role is always "customer" server-side.
export function SignUpForm({ next, signInHref }: { next: string; signInHref: string }) {
  const router = useRouter();

  const { formRef, onSubmit, pending, formError, field } = useAuthForm({
    validators: { name: validateName, email: validateEmail, password: validateNewPassword },
    async submit({ name, email, password }) {
      const { error } = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      if (!error) {
        router.replace(next);
        router.refresh();
        return { ok: true };
      }
      if (error.status === 429) return { ok: false, formError: TOO_MANY_ATTEMPTS };
      if (isInvalidEmailError(error)) return { ok: false, fieldErrors: { email: INVALID_EMAIL } };

      switch (error.code) {
        case "INVALID_NAME":
          return { ok: false, fieldErrors: { name: `Use 1–${NAME_MAX} characters.` } };
        case "USER_ALREADY_EXISTS":
        case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
          return {
            ok: false,
            fieldErrors: { email: "An account with this email already exists." },
            formError: (
              <>
                You already have an account with this email.{" "}
                <Link href={signInHref} className="link">
                  Sign in instead
                </Link>
              </>
            ),
          };
        case "PASSWORD_TOO_SHORT":
          return {
            ok: false,
            fieldErrors: { password: `Use at least ${PASSWORD_MIN} characters.` },
          };
        case "PASSWORD_TOO_LONG":
          return {
            ok: false,
            fieldErrors: { password: `Use ${PASSWORD_MAX} characters or fewer.` },
          };
        default:
          return { ok: false, formError: "We couldn’t create your account. Please try again." };
      }
    },
  });

  return (
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
          {...field("name")}
          label="Name"
          autoComplete="name"
          maxLength={NAME_MAX}
          required
        />
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
          autoComplete="new-password"
          minLength={PASSWORD_MIN}
          maxLength={PASSWORD_MAX}
          hint={`At least ${PASSWORD_MIN} characters.`}
          required
          revealable
        />
        <button type="submit" className="btn btn-primary btn-block mt-2">
          {pending ? "Creating account…" : "Create account"}
        </button>
      </FormFields>
    </form>
  );
}
