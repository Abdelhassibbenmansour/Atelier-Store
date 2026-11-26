// Client-side checks for the sign-in and sign-up forms. They mirror the server rules
// in src/lib/auth.ts (emailAndPassword) so customers see problems before submitting;
// the server still validates everything.

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const NAME_MAX = 100;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

export function validateName(value: string): string | undefined {
  const name = value.trim();
  if (!name) return "Enter your name.";
  if (name.length > NAME_MAX) return `Use ${NAME_MAX} characters or fewer.`;
}

export function validateEmail(value: string): string | undefined {
  const email = value.trim();
  if (!email) return "Enter your email address.";
  if (!EMAIL_PATTERN.test(email)) return "Enter an email address like name@example.com.";
}

/** Sign-in: only presence, so we never hint at the stored password's rules. */
export function validateCurrentPassword(value: string): string | undefined {
  if (!value) return "Enter your password.";
}

export function validateNewPassword(value: string): string | undefined {
  if (!value) return "Create a password.";
  if (value.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (value.length > PASSWORD_MAX) return `Use ${PASSWORD_MAX} characters or fewer.`;
}

/** Runs each validator and returns only the failing fields. */
export function collectErrors<Field extends string>(
  values: Record<Field, string>,
  validators: Record<Field, (value: string) => string | undefined>,
): FieldErrors<Field> {
  const errors: FieldErrors<Field> = {};
  for (const field of Object.keys(validators) as Field[]) {
    const error = validators[field](values[field]);
    if (error) errors[field] = error;
  }
  return errors;
}

/**
 * True when the server rejected the email's format. Better Auth reports this as
 * VALIDATION_ERROR "[body.email] Invalid email address" (its check is stricter than
 * ours), or INVALID_EMAIL.
 */
export function isInvalidEmailError(error: { code?: string; message?: string }) {
  return (
    error.code === "INVALID_EMAIL" ||
    (error.code === "VALIDATION_ERROR" && Boolean(error.message?.includes("body.email")))
  );
}

export const INVALID_EMAIL = "Enter a valid email address.";

export const TOO_MANY_ATTEMPTS = "Too many attempts. Please wait a moment and try again.";
export const NETWORK_ERROR = "We couldn’t reach Atelier. Check your connection and try again.";
