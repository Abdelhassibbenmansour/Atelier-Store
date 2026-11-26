import type { ReactNode } from "react";

/** Shared frame for /sign-in and /sign-up: narrow column, editorial heading. */
export function AuthPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="container-narrow section">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8">
        <header className="flex flex-col gap-3 text-center">
          <p className="eyebrow text-muted">{eyebrow}</p>
          <h1 className="heading-display text-headline">{title}</h1>
          <p className="text-body text-muted">{intro}</p>
        </header>
        {children}
      </div>
    </div>
  );
}
