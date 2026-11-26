"use client";

import {
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import { NETWORK_ERROR, collectErrors, type FieldErrors } from "./validation";

/* ---------------------------------------------------------------------------
   Form state
   --------------------------------------------------------------------------- */

export type SubmitResult<Field extends string> =
  | { ok: true }
  | { ok: false; fieldErrors?: FieldErrors<Field>; formError?: ReactNode };

/**
 * Validation, pending and error state shared by the sign-in and sign-up forms.
 *
 * - Fields are validated when they lose focus, then re-checked on every keystroke
 *   once they show an error, so a message disappears as soon as it is fixed.
 * - Submit validates everything and focuses the first invalid field.
 * - `pending` stays true until navigation after a successful submit finishes.
 */
export function useAuthForm<Field extends string>({
  validators,
  submit,
}: {
  validators: Record<Field, (value: string) => string | undefined>;
  submit: (values: Record<Field, string>) => Promise<SubmitResult<Field>>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<Field>>({});
  const [formError, setFormError] = useState<ReactNode>(null);
  const [pending, startTransition] = useTransition();
  const fields = Object.keys(validators) as Field[];

  function readValues(form: HTMLFormElement) {
    const data = new FormData(form);
    return Object.fromEntries(fields.map((f) => [f, String(data.get(f) ?? "")])) as Record<
      Field,
      string
    >;
  }

  function focusField(field: Field) {
    const element = formRef.current?.elements.namedItem(field);
    if (element instanceof HTMLInputElement) element.focus();
  }

  function setFieldError(field: Field, value: string) {
    setFieldErrors((current) => {
      const error = validators[field](value);
      if (current[field] === error) return current;
      return { ...current, [field]: error };
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const values = readValues(event.currentTarget);
    const errors = collectErrors(values, validators);
    setFieldErrors(errors);
    setFormError(null);

    const firstInvalid = fields.find((field) => errors[field]);
    if (firstInvalid) {
      focusField(firstInvalid);
      return;
    }

    startTransition(async () => {
      let result: SubmitResult<Field>;
      try {
        result = await submit(values);
      } catch {
        result = { ok: false, formError: NETWORK_ERROR };
      }
      if (result.ok) return;

      setFieldErrors(result.fieldErrors ?? {});
      setFormError(result.formError ?? null);
      const fieldWithError = fields.find((field) => result.fieldErrors?.[field]);
      if (fieldWithError) focusField(fieldWithError);
    });
  }

  /** Props for an <AuthField> bound to `field`. */
  function field(name: Field) {
    return {
      name,
      error: fieldErrors[name],
      onBlur: (event: FormEvent<HTMLInputElement>) => {
        // Don't flag an untouched empty field just because focus passed through it.
        if (event.currentTarget.value || fieldErrors[name]) {
          setFieldError(name, event.currentTarget.value);
        }
      },
      onChange: (event: FormEvent<HTMLInputElement>) => {
        if (fieldErrors[name]) setFieldError(name, event.currentTarget.value);
      },
    };
  }

  return { formRef, onSubmit, pending, formError, field };
}

/* ---------------------------------------------------------------------------
   UI
   --------------------------------------------------------------------------- */

type AuthFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "name"> & {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  /** Adds a Show / Hide toggle (password fields). */
  revealable?: boolean;
};

/** Labelled input with hint and inline error, styled like the newsletter field. */
export function AuthField({
  label,
  hint,
  error,
  revealable = false,
  type = "text",
  ...input
}: AuthFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const [revealed, setRevealed] = useState(false);
  // The hint is replaced by the error while one shows, so only reference what renders.
  const describedBy = (error ? errorId : hint ? hintId : "") || undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={revealable && revealed ? "text" : type}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={`min-h-control w-full border border-line-strong bg-paper px-4 text-body-sm outline-none focus-visible:outline-1 focus-visible:outline-offset-2 aria-invalid:border-error aria-invalid:focus-visible:outline-error disabled:text-muted ${revealable ? "pr-20" : ""}`}
          {...input}
        />
        {revealable && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-controls={id}
            aria-pressed={revealed}
            aria-label={revealed ? "Hide password" : "Show password"}
            className="link-nav absolute inset-y-0 right-0 px-4 text-muted hover:text-ink"
          >
            {revealed ? "Hide" : "Show"}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-caption text-error">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="text-caption text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Form-level message (wrong credentials, rate limit, network). Announced when shown. */
export function FormError({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="border border-error px-4 py-3 text-body-sm text-error">
      {children}
    </div>
  );
}

/** Disables every control while submitting, without changing layout. */
export function FormFields({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <fieldset disabled={pending} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
      {children}
    </fieldset>
  );
}
