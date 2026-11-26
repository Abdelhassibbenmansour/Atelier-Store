"use client";

// Form fields for admin forms: label, optional hint, inline error with aria-invalid.
// Same styling as the auth fields (src/app/(auth)/_components/auth-form.tsx).
import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

export const inputClass =
  "min-h-control w-full border border-line-strong bg-paper px-4 text-body-sm outline-none focus-visible:outline-1 focus-visible:outline-offset-2 aria-invalid:border-error disabled:bg-surface disabled:text-muted";

type FieldShellProps = {
  label: string;
  hint?: string;
  error?: string;
  children: (ids: { id: string; describedBy?: string }) => ReactNode;
};

function FieldShell({ label, hint, error, children }: FieldShellProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      {children({ id, describedBy })}
      {error ? (
        <p id={`${id}-error`} className="text-caption text-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-caption text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type Common = { label: string; hint?: string; error?: string };

export function TextField({
  label,
  hint,
  error,
  ...input
}: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      {({ id, describedBy }) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={inputClass}
          {...input}
        />
      )}
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  ...input
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      {({ id, describedBy }) => (
        <textarea
          id={id}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={`${inputClass} py-3`}
          rows={4}
          {...input}
        />
      )}
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  children,
  ...input
}: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      {({ id, describedBy }) => (
        <select
          id={id}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={inputClass}
          {...input}
        >
          {children}
        </select>
      )}
    </FieldShell>
  );
}

export function CheckboxField({
  label,
  hint,
  ...input
}: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input id={id} type="checkbox" className="mt-0.5 size-4 accent-ink" {...input} />
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-body-sm">
          {label}
        </label>
        {hint && <p className="text-caption text-muted">{hint}</p>}
      </div>
    </div>
  );
}

/** Result of the last action: error (announced) or success. */
export function ActionMessage({
  state,
}: {
  state: { status: "idle" } | { status: "success" | "error"; message: string };
}) {
  if (state.status === "idle") return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={`text-body-sm ${state.status === "error" ? "text-error" : "text-success"}`}
    >
      {state.message}
    </p>
  );
}
