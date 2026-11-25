"use client";

import { useId, useState, type FormEvent } from "react";

// UI only: no subscription backend yet.
export function NewsletterForm() {
  const [submitted, setSubmitted] = useState(false);
  const inputId = useId();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p role="status" className="text-body-sm">
        Thank you. You&apos;re on the list.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
      <label htmlFor={inputId} className="sr-only">
        Email address
      </label>
      <input
        id={inputId}
        type="email"
        name="email"
        required
        autoComplete="email"
        placeholder="Email address"
        className="min-h-control flex-1 border border-line-strong bg-paper px-4 text-body-sm outline-none focus-visible:outline-1 focus-visible:outline-offset-2"
      />
      <button type="submit" className="btn btn-primary">
        Subscribe
      </button>
    </form>
  );
}
